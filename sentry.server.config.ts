import * as Sentry from "@sentry/nextjs";
import { sentryDataCollection, sentryTracesSampleRate } from "@/lib/observability/sentry-options";

const dsn = process.env.SENTRY_DSN ?? process.env.NEXT_PUBLIC_SENTRY_DSN;

Sentry.init({
  dsn,
  enabled: Boolean(dsn),
  environment: process.env.VERCEL_ENV ?? process.env.NODE_ENV,
  tracesSampleRate: sentryTracesSampleRate,
  dataCollection: sentryDataCollection,
});
