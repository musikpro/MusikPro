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
  /** AI-generated per-locale { en: { name, description, bonus }, es: {...}, pt: {...} } — see lib/i18n/catalog-translate.ts. */
  translations: jsonb("translations"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const coupons = pgTable(
  "coupons",
  {
    id: text("id").primaryKey(),
    code: text("code").notNull().unique(),
    /** "percent" (value is 1-100) or "fixed" (value is a XOF amount, the app's source-of-truth currency). */
    type: text("type").notNull().default("percent"),
    value: numeric("value", { precision: 18, scale: 2, mode: "number" }).notNull(),
    description: text("description").notNull().default(""),
    active: boolean("active").notNull().default(true),
    maxRedemptions: integer("max_redemptions"),
    redemptionCount: integer("redemption_count").notNull().default(0),
    expiresAt: timestamp("expires_at"),
    sortOrder: integer("sort_order").notNull().default(100),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => ({
    activeOrderIndex: index("coupons_active_order_idx").on(table.active, table.sortOrder),
  }),
);

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
    couponId: text("coupon_id").references(() => coupons.id, { onDelete: "set null" }),
    /** Snapshot of the code at payment time so it still displays if the coupon is later renamed/deleted. */
    couponCode: text("coupon_code"),
    discountAmount: numeric("discount_amount", { precision: 18, scale: 2, mode: "number" }),
    /** Idempotency guard so a webhook/cron race can never increment coupons.redemption_count twice for the same payment. */
    couponRedeemed: boolean("coupon_redeemed").notNull().default(false),
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

/**
 * Product funnel telemetry (see /admin/funnel and lib/admin/funnel.ts) — only "creation_started"
 * is written today; the schema stays open for future steps (visit, abandoned) without a new
 * migration. Purged after 180 days by app/api/cron/funnel-retention/route.ts.
 */
export const funnelEvents = pgTable(
  "funnel_events",
  {
    id: text("id").primaryKey(),
    userId: text("user_id").references(() => user.id, { onDelete: "set null" }),
    event: text("event").notNull(),
    metadata: jsonb("metadata"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => ({
    eventCreatedAtIndex: index("funnel_events_event_created_at_idx").on(table.event, table.createdAt),
  }),
);

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
    /** Description technique envoyée en priorité à l'IA génératrice de musique (Musicful) — voir lib/ai/style-prompt.ts. */
    aiDescription: text("ai_description").notNull().default(""),
    icon: text("icon").notNull().default("music-2"),
    tone: text("tone").notNull().default("orange"),
    active: boolean("active").notNull().default(true),
    sortOrder: integer("sort_order").notNull().default(100),
    /** AI-generated per-locale { en: { name, description }, es: {...}, pt: {...} } — see lib/i18n/catalog-translate.ts. */
    translations: jsonb("translations"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => ({
    activeOrderIndex: index("music_styles_active_order_idx").on(table.active, table.sortOrder),
  }),
);

export const occasions = pgTable(
  "occasions",
  {
    id: text("id").primaryKey(),
    name: text("name").notNull(),
    slug: text("slug").notNull().unique(),
    description: text("description").notNull().default(""),
    emoji: text("emoji").notNull().default("🎉"),
    active: boolean("active").notNull().default(true),
    sortOrder: integer("sort_order").notNull().default(100),
    /** AI-generated per-locale { en: { name, description }, es: {...}, pt: {...} } — see lib/i18n/catalog-translate.ts. */
    translations: jsonb("translations"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => ({
    activeOrderIndex: index("occasions_active_order_idx").on(table.active, table.sortOrder),
  }),
);

export const recipientRelations = pgTable(
  "recipient_relations",
  {
    id: text("id").primaryKey(),
    name: text("name").notNull(),
    slug: text("slug").notNull().unique(),
    active: boolean("active").notNull().default(true),
    sortOrder: integer("sort_order").notNull().default(100),
    /** AI-generated per-locale { en: { name }, es: {...}, pt: {...} } — see lib/i18n/catalog-translate.ts. */
    translations: jsonb("translations"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => ({
    activeOrderIndex: index("recipient_relations_active_order_idx").on(table.active, table.sortOrder),
  }),
);

export const languages = pgTable(
  "languages",
  {
    id: text("id").primaryKey(),
    code: text("code").notNull().unique(),
    name: text("name").notNull(),
    nativeName: text("native_name").notNull(),
    flag: text("flag").notNull().default("🌍"),
    interfaceEnabled: boolean("interface_enabled").notNull().default(false),
    lyricsEnabled: boolean("lyrics_enabled").notNull().default(true),
    interfaceOrder: integer("interface_order").notNull().default(100),
    lyricsOrder: integer("lyrics_order").notNull().default(100),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => ({
    interfaceOrderIndex: index("languages_interface_order_idx").on(table.interfaceEnabled, table.interfaceOrder),
    lyricsOrderIndex: index("languages_lyrics_order_idx").on(table.lyricsEnabled, table.lyricsOrder),
  }),
);

export const localizationSettings = pgTable("localization_settings", {
  id: text("id").primaryKey().default("global"),
  automaticDetectionEnabled: boolean("automatic_detection_enabled").notNull().default(true),
  defaultLanguageCode: text("default_language_code").notNull().default("fr"),
  countryCacheTtlSeconds: integer("country_cache_ttl_seconds").notNull().default(604800),
  /** ISO 3166-1 alpha-2 country assumed when detection can't resolve one (IP/API failure). */
  fallbackCountryCode: text("fallback_country_code"),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

/** Admin-managed country -> interface language mapping used by automatic detection (see lib/languages/detection.ts). */
export const countryLanguages = pgTable("country_languages", {
  countryCode: text("country_code").primaryKey(),
  countryName: text("country_name").notNull(),
  flag: text("flag").notNull().default("🌍"),
  languageCode: text("language_code").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const libraryCollections = pgTable(
  "library_collections",
  {
    id: text("id").primaryKey(),
    name: text("name").notNull(),
    slug: text("slug").notNull().unique(),
    description: text("description").notNull().default(""),
    access: text("access").notNull().default("public"),
    active: boolean("active").notNull().default(true),
    styles: jsonb("styles").notNull().default([]),
    sortOrder: integer("sort_order").notNull().default(100),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => ({
    publicationOrderIndex: index("library_collections_publication_order_idx").on(
      table.active,
      table.access,
      table.sortOrder,
    ),
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

/** Global admin-only switch letting a real account generate without credits/payment while gateways are still being set up. */
export const paymentBypassSettings = pgTable("payment_bypass_settings", {
  id: text("id").primaryKey().default("global"),
  enabled: boolean("enabled").notNull().default(false),
  enabledBy: text("enabled_by").references(() => user.id, { onDelete: "set null" }),
  enabledAt: timestamp("enabled_at"),
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

export const aiProviderConfigs = pgTable("ai_provider_configs", {
  id: text("id").primaryKey(),
  provider: text("provider").notNull().unique().default("openai"),
  isDefaultForLyrics: boolean("is_default_for_lyrics").notNull().default(false),
  enabled: boolean("enabled").notNull().default(false),
  apiKeyCiphertext: text("api_key_ciphertext"),
  apiKeyIv: text("api_key_iv"),
  apiKeyAuthTag: text("api_key_auth_tag"),
  apiKeyLast4: text("api_key_last4"),
  /**
   * Anthropic-only, optional: a separate, more privileged "Admin API key" (sk-ant-admin01-…)
   * used solely to read the organization's monthly spend via the Cost Report Admin API — see
   * lib/ai/anthropic-usage.ts. Deliberately never reused for lyrics generation (apiKeyCiphertext
   * above), which only needs the standard, narrower-scoped key.
   */
  adminApiKeyCiphertext: text("admin_api_key_ciphertext"),
  adminApiKeyIv: text("admin_api_key_iv"),
  adminApiKeyAuthTag: text("admin_api_key_auth_tag"),
  adminApiKeyLast4: text("admin_api_key_last4"),
  defaultModel: text("default_model").notNull().default("gpt-5.6-terra"),
  maxOutputTokens: integer("max_output_tokens").notNull().default(4000),
  requestsPerMinute: integer("requests_per_minute").notNull().default(10),
  lyricsGenerationEnabled: boolean("lyrics_generation_enabled").notNull().default(true),
  lyricsRewriteEnabled: boolean("lyrics_rewrite_enabled").notNull().default(true),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const audioProviderConfigs = pgTable("audio_provider_configs", {
  id: text("id").primaryKey(),
  provider: text("provider").notNull().unique().default("musicful"),
  enabled: boolean("enabled").notNull().default(false),
  apiKeyCiphertext: text("api_key_ciphertext"),
  apiKeyIv: text("api_key_iv"),
  apiKeyAuthTag: text("api_key_auth_tag"),
  apiKeyLast4: text("api_key_last4"),
  apiBaseUrl: text("api_base_url").notNull().default("https://api.musicful.ai"),
  defaultModel: text("default_model").notNull().default("MFV3.0"),
  defaultInstrumental: boolean("default_instrumental").notNull().default(false),
  defaultGender: text("default_gender"),
  requestTimeoutMs: integer("request_timeout_ms").notNull().default(60000),
  pollingIntervalMs: integer("polling_interval_ms").notNull().default(5000),
  maxPollingMinutes: integer("max_polling_minutes").notNull().default(10),
  maxRetries: integer("max_retries").notNull().default(2),
  allowTextToMusic: boolean("allow_text_to_music").notNull().default(true),
  allowLyricsToMusic: boolean("allow_lyrics_to_music").notNull().default(true),
  allowInstrumental: boolean("allow_instrumental").notNull().default(true),
  allowLyricsGenerator: boolean("allow_lyrics_generator").notNull().default(true),
  allowVibe: boolean("allow_vibe").notNull().default(true),
  allowWavConversion: boolean("allow_wav_conversion").notNull().default(true),
  /**
   * @deprecated Musicful v2 — MP3 Only: no code reads or writes this column anymore (MP4
   * generation was removed — it was already unreachable from any UI). Kept as a nullable-effect
   * legacy column instead of a destructive DROP COLUMN migration; see
   * .agents/skills/Musicful-v2-MP3-Only-SKILL.md section 24.
   */
  allowMp4Conversion: boolean("allow_mp4_conversion").notNull().default(true),
  /**
   * Musicful's generate endpoint has no request-time audio-format parameter (confirmed
   * against their official docs) — the finished file's type is decided by their backend and
   * varies per song. "native" accepts whatever they hand back (falling back to a WAV
   * conversion only when it isn't audio-typed at all, e.g. served as video/mp4); "wav" forces
   * every finished song through their WAV conversion endpoint for guaranteed studio-quality
   * audio, regardless of what the native file already was.
   */
  preferredAudioFormat: text("preferred_audio_format").notNull().default("native"),
  /**
   * When enabled, the style prompt sent to Musicful is built from the admin's music-style
   * catalog description (e.g. Zouglou's "Musique ivoirienne, festive, sociale, engagée") plus
   * an explicit instruction to stay authentic to that exact genre, instead of just the bare
   * genre name — see lib/ai/style-prompt.ts. Applies to every style in the catalog, present or
   * future, since it's a live lookup rather than per-genre logic.
   */
  strictStyleAdherence: boolean("strict_style_adherence").notNull().default(true),
  maxGenerationsPerUserPerDay: integer("max_generations_per_user_per_day").notNull().default(5),
  maxGenerationsPerUserPerHour: integer("max_generations_per_user_per_hour").notNull().default(2),
  maxConcurrentJobs: integer("max_concurrent_jobs").notNull().default(2),
  /**
   * How many Musicful jobs (versions) a single generation request submits — see
   * lib/ai/songs.ts's submitSongGeneration(). Independent from CREDITS_PER_GENERATION
   * (lib/credit-plans/catalog.ts): changing this does not change what a generation costs.
   */
  versionsPerGeneration: integer("versions_per_generation").notNull().default(1),
  lastConnectionStatus: text("last_connection_status"),
  lastConnectionError: text("last_connection_error"),
  lastTestedAt: timestamp("last_tested_at"),
  providerKeyStatus: integer("provider_key_status"),
  providerCredits: text("provider_credits"),
  providerEmail: text("provider_email"),
  providerMemberId: text("provider_member_id"),
  providerKeyName: text("provider_key_name"),
  providerKeyCreatedAt: text("provider_key_created_at"),
  providerLastUsedAt: text("provider_last_used_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const musicGenerationJobs = pgTable(
  "music_generation_jobs",
  {
    id: text("id").primaryKey(),
    userId: text("user_id").references(() => user.id, { onDelete: "set null" }),
    provider: text("provider").notNull().default("musicful"),
    providerTaskId: text("provider_task_id"),
    providerSongId: text("provider_song_id"),
    action: text("action").notNull().default("auto"),
    model: text("model").notNull(),
    prompt: text("prompt"),
    lyrics: text("lyrics"),
    style: text("style"),
    title: text("title"),
    occasion: text("occasion"),
    instrumental: boolean("instrumental").notNull().default(false),
    gender: text("gender"),
    status: text("status").notNull().default("queued"),
    providerStatus: integer("provider_status"),
    durationSeconds: integer("duration_seconds"),
    audioUrl: text("audio_url"),
    coverUrl: text("cover_url"),
    wavUrl: text("wav_url"),
    /** @deprecated Musicful v2 — MP3 Only: no longer read or written; see allowMp4Conversion above. */
    mp4Url: text("mp4_url"),
    /**
     * Musicful v2 — MP3 Only: `audioUrl` above is the sole user-facing field (unchanged
     * contract), but it is now guaranteed to point at a verified `audio/mpeg` asset —
     * transcoded via Cloudinary when Musicful's native/WAV result wasn't already MP3. These
     * two columns are diagnostics only (admin/audit), never read by the UI.
     */
    audioMimeType: text("audio_mime_type"),
    audioNormalized: boolean("audio_normalized").notNull().default(false),
    failureCode: integer("failure_code"),
    failureReason: text("failure_reason"),
    requestPayload: jsonb("request_payload"),
    responsePayload: jsonb("response_payload"),
    songGroupId: text("song_group_id"),
    versionLabel: text("version_label"),
    plays: integer("plays").notNull().default(0),
    liked: boolean("liked").notNull().default(false),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    startedAt: timestamp("started_at"),
    completedAt: timestamp("completed_at"),
    failedAt: timestamp("failed_at"),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => ({
    userCreatedIndex: index("music_generation_jobs_user_created_idx").on(table.userId, table.createdAt),
    songGroupIndex: index("music_generation_jobs_song_group_idx").on(table.userId, table.songGroupId),
  }),
);

export const customRoles = pgTable("custom_role", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description").notNull().default(""),
  color: text("color").notNull().default("orange"),
  /** Subset of PermissionModule keys (lib/auth/permissions.ts) — decorative, like the rest of the matrix. */
  permissions: jsonb("permissions").notNull().default([]),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const phonePrefixes = pgTable(
  "phone_prefixes",
  {
    id: text("id").primaryKey(),
    countryCode: text("country_code").notNull().unique(),
    countryName: text("country_name").notNull(),
    flag: text("flag").notNull(),
    dialCode: text("dial_code").notNull(),
    digits: integer("digits").notNull(),
    placeholder: text("placeholder").notNull(),
    active: boolean("active").notNull().default(true),
    sortOrder: integer("sort_order").notNull().default(100),
    /** AI-generated per-locale { en: { countryName }, es: {...}, pt: {...} } — see lib/i18n/catalog-translate.ts. */
    translations: jsonb("translations"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => ({
    activeOrderIndex: index("phone_prefixes_active_order_idx").on(table.active, table.sortOrder),
  }),
);
