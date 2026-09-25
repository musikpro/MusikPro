const SERVER_ONLY_PREFIXES = [
  "DATABASE_URL",
  "DATABASE_SERVICE_URL",
  "BETTER_AUTH_SECRET",
  "RESEND_API_KEY",
  "CHARIOW_",
  "FEDAPAY_",
  "DJOMY_",
  "PAYDUNYA_",
  "FLUTTERWAVE_",
  "MONEROO_",
  "PAYTECH_",
  "BICTORYS_",
  "STRIPE_",
  "UPSTASH_",
  "GOOGLE_CLIENT_SECRET",
  "CRON_SECRET",
  "TURNSTILE_SECRET_KEY",
  "CLOUDFLARE_R2_SECRET_ACCESS_KEY",
];

export function assertServerOnlyEnv() {
  for (const name of Object.keys(process.env)) {
    if (name.startsWith("NEXT_PUBLIC_") && SERVER_ONLY_PREFIXES.some((p) => name.includes(p))) {
      throw new Error(`Security error: secret-like variable must not be public: ${name}`);
    }
  }
}

export function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`Missing required environment variable: ${name}`);
  return value;
}
