-- Retrait du fournisseur Replicate (ACE-Step 1.5) : registre des versions + journal d'audit + réglages du fournisseur
-- (clé API chiffrée et jeton de webhook compris). Les chansons déjà générées et l'historique des jobs sont conservés.
-- Idempotent : sans effet si les tables ou la ligne n'existent plus.
DELETE FROM "audio_provider_configs" WHERE "provider" = 'replicate';
--> statement-breakpoint
DROP TABLE IF EXISTS "replicate_model_version_events" CASCADE;
--> statement-breakpoint
DROP TABLE IF EXISTS "replicate_model_versions" CASCADE;
