CREATE TABLE "country_languages" (
	"country_code" text PRIMARY KEY NOT NULL,
	"country_name" text NOT NULL,
	"flag" text DEFAULT '🌍' NOT NULL,
	"language_code" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
INSERT INTO "country_languages" ("country_code", "country_name", "flag", "language_code") VALUES
  ('BJ', 'Bénin', '🇧🇯', 'fr'),
  ('BF', 'Burkina Faso', '🇧🇫', 'fr'),
  ('CM', 'Cameroun', '🇨🇲', 'fr'),
  ('TD', 'Tchad', '🇹🇩', 'fr'),
  ('CG', 'Congo-Brazzaville', '🇨🇬', 'fr'),
  ('CD', 'RDC', '🇨🇩', 'fr'),
  ('CI', 'Côte d''Ivoire', '🇨🇮', 'fr'),
  ('GA', 'Gabon', '🇬🇦', 'fr'),
  ('GH', 'Ghana', '🇬🇭', 'en'),
  ('GN', 'Guinée', '🇬🇳', 'fr'),
  ('KE', 'Kenya', '🇰🇪', 'en'),
  ('ML', 'Mali', '🇲🇱', 'fr'),
  ('MZ', 'Mozambique', '🇲🇿', 'pt'),
  ('NE', 'Niger', '🇳🇪', 'fr'),
  ('NG', 'Nigeria', '🇳🇬', 'en'),
  ('RW', 'Rwanda', '🇷🇼', 'fr'),
  ('SN', 'Sénégal', '🇸🇳', 'fr'),
  ('TZ', 'Tanzanie', '🇹🇿', 'en'),
  ('UG', 'Ouganda', '🇺🇬', 'en'),
  ('ZM', 'Zambie', '🇿🇲', 'en')
ON CONFLICT ("country_code") DO NOTHING;
--> statement-breakpoint
GRANT SELECT ON TABLE "country_languages" TO musikpro_runtime;
--> statement-breakpoint
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE "country_languages" TO musikpro_service;
