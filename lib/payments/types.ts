export type PaymentProviderId =
  | "chariow"
  | "fedapay"
  | "djomy"
  | "paydunya"
  | "flutterwave"
  | "moneroo"
  | "paytech"
  | "bictorys"
  | "stripe";

export type Money = { amount: number; currency: "XOF" | "XAF" | "NGN" | "GHS" | "KES" | "USD" | "EUR" };

export type CheckoutInput = {
  reference: string;
  money: Money;
  customer: { id?: string; name?: string; email?: string; phone?: string };
  country?: string;
  successUrl: string;
  cancelUrl: string;
  metadata?: Record<string, unknown>;
  providerContext?: Record<string, unknown>;
};

export type CheckoutResult = {
  provider: PaymentProviderId;
  externalId?: string;
  status: "pending" | "paid" | "failed";
  checkoutUrl?: string;
  money?: { amount: number; currency: string };
  raw?: unknown;
};

export interface PaymentProvider {
  id: PaymentProviderId;
  createCheckout(input: CheckoutInput): Promise<CheckoutResult>;
  verifyPayment(externalId: string): Promise<CheckoutResult>;
  verifyWebhook(request: Request): Promise<boolean>;
  parseWebhook(request: Request): Promise<{ id: string; type: string; payload: unknown }>;
}
