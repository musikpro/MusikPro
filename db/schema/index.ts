import { pgTable, text, timestamp, integer, numeric, jsonb, boolean, uniqueIndex, index } from "drizzle-orm/pg-core";
import { user, organization } from "./auth.generated";

export const plans = pgTable("plans", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description"),
  code: text("code").notNull().unique(),
  amount: numeric("amount", { precision: 18, scale: 2, mode: "number" }).notNull(),
  currency: text("currency").notNull().default("XOF"),
  interval: text("interval").notNull().default("month"),
  active: boolean("active").notNull().default(true),
  features: jsonb("features"),
  metadata: jsonb("metadata"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const subscriptions = pgTable(
  "subscriptions",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    organizationId: text("organization_id").references(() => organization.id, { onDelete: "set null" }),
    planId: text("plan_id")
      .notNull()
      .references(() => plans.id, { onDelete: "restrict" }),
    provider: text("provider").notNull(),
    providerSubscriptionId: text("provider_subscription_id"),
    status: text("status").notNull().default("pending"),
    renewalMode: text("renewal_mode").notNull().default("manual"),
    currentPeriodEnd: timestamp("current_period_end"),
    lastPaymentId: text("last_payment_id"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => ({
    userPlanUnique: uniqueIndex("subscriptions_user_plan_unique").on(table.userId, table.planId),
    statusIndex: index("subscriptions_status_idx").on(table.status),
  }),
);

export const payments = pgTable(
  "payments",
  {
    id: text("id").primaryKey(),
    userId: text("user_id").references(() => user.id, { onDelete: "set null" }),
    organizationId: text("organization_id").references(() => organization.id, { onDelete: "set null" }),
    planId: text("plan_id").references(() => plans.id, { onDelete: "set null" }),
    reference: text("reference").notNull().unique(),
    provider: text("provider").notNull(),
    providerPaymentId: text("provider_payment_id"),
    providerAmount: numeric("provider_amount", { precision: 18, scale: 2, mode: "number" }),
    providerCurrency: text("provider_currency"),
    amount: numeric("amount", { precision: 18, scale: 2, mode: "number" }).notNull(),
    currency: text("currency").notNull(),
    status: text("status").notNull().default("pending"),
    country: text("country"),
    method: text("method"),
    metadata: jsonb("metadata"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    paidAt: timestamp("paid_at"),
  },
  (table) => ({
    providerPaymentUnique: uniqueIndex("payments_provider_payment_unique").on(table.provider, table.providerPaymentId),
    statusCreatedIndex: index("payments_status_created_idx").on(table.status, table.createdAt),
    userCreatedIndex: index("payments_user_created_idx").on(table.userId, table.createdAt),
  }),
);

export const paymentFulfillments = pgTable("payment_fulfillments", {
  id: text("id").primaryKey(),
  paymentId: text("payment_id")
    .notNull()
    .unique()
    .references(() => payments.id, { onDelete: "cascade" }),
  provider: text("provider").notNull(),
  appliedAt: timestamp("applied_at").defaultNow().notNull(),
});

export const webhookEvents = pgTable(
  "webhook_events",
  {
    id: text("id").primaryKey(),
    provider: text("provider").notNull(),
    externalEventId: text("external_event_id").notNull(),
    type: text("type").notNull(),
    payload: jsonb("payload").notNull(),
    processed: boolean("processed").notNull().default(false),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => ({
    providerEventUnique: uniqueIndex("webhook_provider_event_unique").on(table.provider, table.externalEventId),
  }),
);

export const auditLogs = pgTable("audit_logs", {
  id: text("id").primaryKey(),
  actorId: text("actor_id"),
  organizationId: text("organization_id"),
  action: text("action").notNull(),
  targetType: text("target_type"),
  targetId: text("target_id"),
  ip: text("ip"),
  metadata: jsonb("metadata"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const securityEvents = pgTable("security_events", {
  id: text("id").primaryKey(),
  type: text("type").notNull(),
  severity: text("severity").notNull().default("info"),
  actorId: text("actor_id"),
  ip: text("ip"),
  metadata: jsonb("metadata"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const credits = pgTable(
  "credits",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    balance: integer("balance").notNull().default(0),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => ({
    userUnique: uniqueIndex("credits_user_unique").on(table.userId),
  }),
);

export const musicStyles = pgTable(
  "music_styles",
  {
    id: text("id").primaryKey(),
    name: text("name").notNull(),
    slug: text("slug").notNull().unique(),
    description: text("description").notNull(),
    icon: text("icon").notNull().default("music-2"),
    tone: text("tone").notNull().default("orange"),
    active: boolean("active").notNull().default(true),
    sortOrder: integer("sort_order").notNull().default(100),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => ({
    activeOrderIndex: index("music_styles_active_order_idx").on(table.active, table.sortOrder),
  }),
);

export * from "./auth.generated";

export const paymentProviderConfigs = pgTable("payment_provider_configs", {
  id: text("id").primaryKey(),
  provider: text("provider").notNull().unique(),
  enabled: boolean("enabled").notNull().default(false),
  priority: integer("priority").notNull().default(100),
  mode: text("mode").notNull().default("sandbox"),
  config: jsonb("config"),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const paymentCountryRoutes = pgTable(
  "payment_country_routes",
  {
    id: text("id").primaryKey(),
    country: text("country").notNull(),
    provider: text("provider").notNull(),
    enabled: boolean("enabled").notNull().default(true),
    priority: integer("priority").notNull().default(100),
    currencies: jsonb("currencies"),
    methods: jsonb("methods"),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => ({
    countryProviderUnique: uniqueIndex("payment_country_provider_unique").on(table.country, table.provider),
  }),
);

export const planProviderMappings = pgTable(
  "plan_provider_mappings",
  {
    id: text("id").primaryKey(),
    planId: text("plan_id")
      .notNull()
      .references(() => plans.id, { onDelete: "cascade" }),
    provider: text("provider").notNull(),
    externalProductId: text("external_product_id"),
    metadata: jsonb("metadata"),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => ({
    planProviderUnique: uniqueIndex("plan_provider_unique").on(table.planId, table.provider),
  }),
);

export const paymentAttempts = pgTable(
  "payment_attempts",
  {
    id: text("id").primaryKey(),
    paymentId: text("payment_id")
      .notNull()
      .references(() => payments.id, { onDelete: "cascade" }),
    provider: text("provider").notNull(),
    country: text("country"),
    method: text("method"),
    outcome: text("outcome").notNull(), // selected | checkout_created | provider_error | skipped
    latencyMs: integer("latency_ms"),
    errorCode: text("error_code"),
    errorMessage: text("error_message"),
    metadata: jsonb("metadata"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => ({
    providerCreatedIndex: index("payment_attempts_provider_created_idx").on(table.provider, table.createdAt),
  }),
);
