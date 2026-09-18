declare module "fedapay" {
  export const Webhook: {
    constructEvent(payload: Buffer | string, signature: string, secret: string): unknown;
  };
}
