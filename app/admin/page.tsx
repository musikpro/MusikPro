import { and, count, desc, eq, gte, sql } from "drizzle-orm";
import { getServiceDb } from "@/db";
import { payments, plans, subscriptions, user } from "@/db/schema";
import { requireAdmin } from "@/lib/auth/session";
import AdminDashboard, { type AdminDashboardData } from "@/components/admin/AdminDashboard";

function startOfDay() {
  const value = new Date();
  value.setHours(0, 0, 0, 0);
  return value;
}

function startOfMonth() {
  const value = new Date();
  value.setDate(1);
  value.setHours(0, 0, 0, 0);
  return value;
}

export default async function Page() {
  await requireAdmin();
  const db = getServiceDb();
  const [
    [userTotal],
    [planTotal],
    [subscriptionTotal],
    [paymentTotals],
    [monthRevenue],
    [todayRevenue],
    recentPaymentRows,
    recentUserRows,
  ] = await Promise.all([
    db.select({ value: count() }).from(user),
    db.select({ value: count() }).from(plans).where(eq(plans.active, true)),
    db.select({ value: count() }).from(subscriptions).where(eq(subscriptions.status, "active")),
    db
      .select({
        paid: sql<number>`count(*) filter (where ${payments.status} = 'paid')::int`,
        failed: sql<number>`count(*) filter (where ${payments.status} = 'failed')::int`,
        pending: sql<number>`count(*) filter (where ${payments.status} = 'pending')::int`,
      })
      .from(payments),
    db
      .select({ value: sql<number>`coalesce(sum(${payments.amount}), 0)::float` })
      .from(payments)
      .where(and(eq(payments.status, "paid"), gte(payments.createdAt, startOfMonth()))),
    db
      .select({ value: sql<number>`coalesce(sum(${payments.amount}), 0)::float` })
      .from(payments)
      .where(and(eq(payments.status, "paid"), gte(payments.createdAt, startOfDay()))),
    db
      .select({
        id: payments.id,
        amount: payments.amount,
        currency: payments.currency,
        status: payments.status,
        createdAt: payments.createdAt,
        userName: user.name,
        userEmail: user.email,
        planName: plans.name,
      })
      .from(payments)
      .leftJoin(user, eq(payments.userId, user.id))
      .leftJoin(plans, eq(payments.planId, plans.id))
      .orderBy(desc(payments.createdAt))
      .limit(5),
    db
      .select({
        id: user.id,
        name: user.name,
        email: user.email,
        createdAt: user.createdAt,
        verified: user.emailVerified,
      })
      .from(user)
      .orderBy(desc(user.createdAt))
      .limit(5),
  ]);

  const paid = Number(paymentTotals?.paid ?? 0);
  const failed = Number(paymentTotals?.failed ?? 0);
  const pending = Number(paymentTotals?.pending ?? 0);
  const completed = paid + failed;
  const data: AdminDashboardData = {
    users: Number(userTotal?.value ?? 0),
    plans: Number(planTotal?.value ?? 0),
    activeSubscriptions: Number(subscriptionTotal?.value ?? 0),
    paidPayments: paid,
    failedPayments: failed,
    pendingPayments: pending,
    monthRevenue: Number(monthRevenue?.value ?? 0),
    todayRevenue: Number(todayRevenue?.value ?? 0),
    paymentSuccessRate: completed ? (paid / completed) * 100 : 0,
    recentPayments: recentPaymentRows.map((payment) => ({
      id: payment.id,
      user: payment.userName ?? payment.userEmail ?? "Utilisateur supprimé",
      plan: payment.planName ?? "Pack non renseigné",
      amount: payment.amount,
      currency: payment.currency,
      status: payment.status,
      createdAt: payment.createdAt,
    })),
    recentUsers: recentUserRows,
  };
  return <AdminDashboard data={data} />;
}
