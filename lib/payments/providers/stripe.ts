import { HttpPaymentProvider } from "../provider-base";
import type { CheckoutInput, CheckoutResult } from "../types";

export class StripeProvider extends HttpPaymentProvider {
  id = "stripe" as const;

  async createCheckout(_input: CheckoutInput): Promise<CheckoutResult> {
    throw new Error("stripe adapter is scaffolded but requires your merchant credentials and final API mapping before production use.");
  }

  async verifyPayment(_externalId: string): Promise<CheckoutResult> {
    throw new Error("stripe verifyPayment mapping not configured yet.");
  }

  async verifyWebhook(_request: Request): Promise<boolean> {
    return false;
  }

  async parseWebhook(_request: Request): Promise<{ id: string; type: string; payload: unknown }> {
    throw new Error("stripe webhook parser not configured yet.");
  }
}
