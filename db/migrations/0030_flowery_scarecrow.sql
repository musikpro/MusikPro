CREATE TABLE "phone_prefixes" (
	"id" text PRIMARY KEY NOT NULL,
	"country_code" text NOT NULL,
	"country_name" text NOT NULL,
	"flag" text NOT NULL,
	"dial_code" text NOT NULL,
	"digits" integer NOT NULL,
	"placeholder" text NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	"sort_order" integer DEFAULT 100 NOT NULL,
	"translations" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "phone_prefixes_country_code_unique" UNIQUE("country_code")
);
--> statement-breakpoint
CREATE INDEX "phone_prefixes_active_order_idx" ON "phone_prefixes" USING btree ("active","sort_order");
--> statement-breakpoint
INSERT INTO "phone_prefixes" ("id", "country_code", "country_name", "flag", "dial_code", "digits", "placeholder", "active", "sort_order") VALUES
	('default-ci', 'CI', 'Côte d’Ivoire', '🇨🇮', '+225', 10, '0708807015', true, 10),
	('default-sn', 'SN', 'Sénégal', '🇸🇳', '+221', 9, '771234567', true, 20),
	('default-ml', 'ML', 'Mali', '🇲🇱', '+223', 8, '70123456', true, 30),
	('default-bf', 'BF', 'Burkina Faso', '🇧🇫', '+226', 8, '70123456', true, 40),
	('default-ne', 'NE', 'Niger', '🇳🇪', '+227', 8, '90123456', true, 50),
	('default-gh', 'GH', 'Ghana', '🇬🇭', '+233', 9, '241234567', true, 60),
	('default-ng', 'NG', 'Nigeria', '🇳🇬', '+234', 10, '8012345678', true, 70),
	('default-fr', 'FR', 'France', '🇫🇷', '+33', 9, '612345678', true, 80),
	('default-tg', 'TG', 'Togo', '🇹🇬', '+228', 8, '90123456', false, 90),
	('default-bj', 'BJ', 'Bénin', '🇧🇯', '+229', 8, '90123456', false, 100)
ON CONFLICT ("country_code") DO NOTHING;
--> statement-breakpoint
GRANT SELECT ON TABLE "phone_prefixes" TO musikpro_runtime;
--> statement-breakpoint
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE "phone_prefixes" TO musikpro_service;