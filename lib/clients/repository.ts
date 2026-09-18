import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";

async function asUser<T>(userId: string, work: (tx: Prisma.TransactionClient) => Promise<T>) {
  return prisma.$transaction(async (tx) => {
    await tx.$executeRaw`SELECT set_config('app.current_user_id', ${userId}, true)`;
    return work(tx);
  });
}

export function listClients(userId: string) {
  return asUser(userId, (tx) => tx.client.findMany({ where: { userId }, orderBy: { createdAt: "desc" } }));
}

export function getClient(userId: string, id: string) {
  return asUser(userId, (tx) => tx.client.findFirst({ where: { id, userId } }));
}

export function createClient(userId: string, data: { name: string; email?: string | null; phone?: string | null; company?: string | null; notes?: string | null }) {
  return asUser(userId, (tx) => tx.client.create({ data: { ...data, userId } }));
}

export function updateClient(userId: string, id: string, data: { name?: string; email?: string | null; phone?: string | null; company?: string | null; notes?: string | null }) {
  return asUser(userId, async (tx) => {
    const current = await tx.client.findFirst({ where: { id, userId }, select: { id: true } });
    if (!current) return null;
    return tx.client.update({ where: { id }, data });
  });
}

export function deleteClient(userId: string, id: string) {
  return asUser(userId, async (tx) => {
    const current = await tx.client.findFirst({ where: { id, userId }, select: { id: true } });
    if (!current) return null;
    await tx.client.delete({ where: { id } });
    return { id };
  });
}
