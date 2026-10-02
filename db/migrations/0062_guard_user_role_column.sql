-- Défense en profondeur : le rôle applicatif des requêtes (musikpro_runtime) ne peut plus attribuer un rôle élevé.
-- Le changement de rôle passe désormais par le rôle de service (action admin « setRole ») ; musikpro_service et le
-- propriétaire (migrations, bootstrap du premier Super Admin) ne sont pas concernés.
-- Idempotent. À appliquer APRÈS le déploiement du code qui écrit le rôle via le rôle de service.
-- Le rôle de service n'avait que SELECT sur "user" : on lui donne UPDATE sur ces deux colonnes seulement.
GRANT UPDATE ("role", "updated_at") ON TABLE "user" TO musikpro_service;
--> statement-breakpoint
CREATE OR REPLACE FUNCTION guard_user_role_column() RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF current_user = 'musikpro_runtime' THEN
    IF TG_OP = 'INSERT' THEN
      IF NEW.role IS NOT NULL AND NEW.role <> 'user' THEN
        RAISE EXCEPTION 'user.role: attribution d''un rôle élevé interdite pour le rôle applicatif' USING ERRCODE = '42501';
      END IF;
    ELSIF NEW.role IS DISTINCT FROM OLD.role THEN
      RAISE EXCEPTION 'user.role: modification interdite pour le rôle applicatif' USING ERRCODE = '42501';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;
--> statement-breakpoint
DROP TRIGGER IF EXISTS user_role_column_guard ON "user";
--> statement-breakpoint
CREATE TRIGGER user_role_column_guard
  BEFORE INSERT OR UPDATE ON "user"
  FOR EACH ROW EXECUTE FUNCTION guard_user_role_column();
