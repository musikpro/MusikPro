CREATE TABLE IF NOT EXISTS "currencies" (
	"code" text PRIMARY KEY NOT NULL,
	"label" text NOT NULL,
	"symbol" text NOT NULL,
	"units_per_usd" numeric(18, 6) NOT NULL,
	"decimals" integer DEFAULT 2 NOT NULL,
	"enabled" boolean DEFAULT true NOT NULL,
	"auto_update" boolean DEFAULT true NOT NULL,
	"sort_order" integer DEFAULT 100 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "currency_settings" (
	"id" text PRIMARY KEY DEFAULT 'global' NOT NULL,
	"rate_provider" text DEFAULT 'auto' NOT NULL,
	"last_synced_at" timestamp,
	"last_sync_provider" text,
	"last_sync_message" text,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
INSERT INTO "currencies" ("code", "label", "symbol", "units_per_usd", "decimals", "enabled", "sort_order") VALUES
	('XOF', 'Franc CFA (XOF)', 'FCFA', 600, 0, true, 10),
	('XAF', 'Franc CFA (XAF)', 'FCFA', 600, 0, true, 20),
	('USD', 'Dollar ($)', '$', 1, 2, true, 40),
	('EUR', 'Euro (€)', '€', 0.914694, 2, true, 30),
	('NGN', 'Naira (₦)', '₦', 1620, 0, true, 50),
	('GHS', 'Cedi (GH₵)', 'GH₵', 15, 2, true, 60),
	('KES', 'Shilling kényan (KES)', 'KSh', 129, 0, true, 70),
	('CDF', 'Franc congolais (CDF)', 'FC', 2700, 0, true, 80),
	('RWF', 'Franc rwandais (RWF)', 'FRw', 1300, 0, true, 90),
	('TZS', 'Shilling tanzanien (TZS)', 'TSh', 2600, 0, true, 100),
	('UGX', 'Shilling ougandais (UGX)', 'USh', 3700, 0, true, 110),
	('ZMW', 'Kwacha zambien (ZMW)', 'ZK', 27, 2, true, 120),
	('MZN', 'Metical mozambicain (MZN)', 'MT', 64, 2, true, 130),
	('GNF', 'Franc guinéen (GNF)', 'FG', 8700, 0, true, 140)
ON CONFLICT ("code") DO NOTHING;
--> statement-breakpoint
INSERT INTO "currency_settings" ("id") VALUES ('global') ON CONFLICT ("id") DO NOTHING;
--> statement-breakpoint
GRANT SELECT ON TABLE "currencies" TO musikpro_runtime;
--> statement-breakpoint
GRANT SELECT ON TABLE "currency_settings" TO musikpro_runtime;
--> statement-breakpoint
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE "currencies" TO musikpro_service;
--> statement-breakpoint
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE "currency_settings" TO musikpro_service;
