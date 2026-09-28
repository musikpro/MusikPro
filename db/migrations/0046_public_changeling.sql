ALTER TABLE "hero_animation_settings" ADD COLUMN "headline" text DEFAULT 'Crée ta chanson personnalisée' NOT NULL;--> statement-breakpoint
ALTER TABLE "hero_animation_settings" ADD COLUMN "translations" jsonb;--> statement-breakpoint
ALTER TABLE "hero_animation_settings" ADD COLUMN "text_size" text DEFAULT 'md' NOT NULL;