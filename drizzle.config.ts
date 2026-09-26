import { config } from "dotenv";
import { defineConfig } from "drizzle-kit";

// drizzle-kit runs standalone (outside Next's own env loading), so `npm run db:generate`/`db:migrate`
// need this to see DATABASE_URL_DIRECT locally. No-ops harmlessly in prod/CI, where that variable
// already comes from the real environment and no .env.local file exists.
config({ path: ".env.local" });

export default defineConfig({
  schema: "./db/schema/index.ts",
  out: "./db/migrations",
  dialect: "postgresql",
  dbCredentials: { url: (process.env.DATABASE_URL_DIRECT || process.env.DATABASE_URL)! },
});
