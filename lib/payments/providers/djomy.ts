import { HttpPaymentProvider } from "../provider-base";
import type { CheckoutInput, CheckoutResult } from "../types";

export class DjomyProvider extends HttpPaymentProvider {
  id = "djomy" as const;

  async createCheckout(_input: CheckoutInput): Promise<CheckoutResult> {
    throw new Error("djomy adapter is scaffolded but requires your merchant credentials and final API mapping before production use.");
  }

  async verifyPayment(_externalId: string): Promise<CheckoutResult> {
    throw new Error("djomy verifyPayment mapping not configured yet.");
  }

  async verifyWebhook(_request: Request): Promise<boolean> {
    return false;
  }

  async parseWebhook(_request: Request): Promise<{ id: string; type: string; payload: unknown }> {
    throw new Error("djomy webhook parser not configured yet.");
  }
}
