export function paymentWebhookBaseUrl() {
  const value = process.env.PAYMENT_WEBHOOK_BASE_URL || process.env.NEXT_PUBLIC_APP_URL;
  if (!value) throw new Error("PAYMENT_WEBHOOK_BASE_URL or NEXT_PUBLIC_APP_URL is required for webhook URLs");
  const url = new URL(value);
  if (process.env.NODE_ENV === "production" && url.protocol !== "https:")
    throw new Error("Payment webhook base URL must use HTTPS in production");
  return url.toString().replace(/\/$/, "");
}

export function paymentWebhookUrl(provider: string) {
  return new URL(`/api/webhooks/${provider}`, `${paymentWebhookBaseUrl()}/`).toString();
}
