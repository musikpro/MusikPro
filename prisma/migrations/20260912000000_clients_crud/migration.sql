-- Africa SaaS Kit — CRUD Clients (Prisma)
-- Run through Prisma only after Banani screens are imported and the feature is selected.
CREATE TABLE IF NOT EXISTS "Client" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "email" TEXT,
  "phone" TEXT,
  "company" TEXT,
  "notes" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Client_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "Client_userId_idx" ON "Client"("userId");
CREATE INDEX IF NOT EXISTS "Client_userId_name_idx" ON "Client"("userId", "name");

ALTER TABLE "Client" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Client" FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "client_owner_policy" ON "Client";
CREATE POLICY "client_owner_policy" ON "Client"
  USING ("userId" = current_setting('app.current_user_id', true))
  WITH CHECK ("userId" = current_setting('app.current_user_id', true));
