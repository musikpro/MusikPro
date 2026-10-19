import { z } from "zod";

const text = z.string().max(10000).optional();
const scalar = z.union([z.string().max(10000), z.number()]).optional();
const entity = z.looseObject({ id: scalar });
const metadata = z.looseObject({ app_reference: text }).optional();
const transaction = z.looseObject({ id: scalar, amount: scalar, currency: text, status: text }).optional();

export const bictorysPayloadSchema = z.looseObject({
  id: scalar,
  transactionId: scalar,
  chargeId: scalar,
  link: text,
  redirectUrl: text,
  checkoutUrl: text,
  amount: scalar,
  currency: text,
  status: text,
  event: text,
  transaction,
  data: entity.optional(),
  paymentReference: text,
});
export const paytechPayloadSchema = z.looseObject({
  success: scalar,
  token: text,
  message: text,
  redirect_url: text,
  redirectUrl: text,
  status: text,
  payment_status: text,
  item_price: scalar,
  amount: scalar,
  currency: text,
  data: z.looseObject({ status: text, amount: scalar, currency: text }).optional(),
  hmac_compute: text,
  ref_command: text,
  api_key_sha256: text,
  api_secret_sha256: text,
  type_event: text,
});
const flutterwaveData = z.looseObject({
  id: scalar,
  link: text,
  amount: scalar,
  currency: text,
  status: text,
});
export const flutterwavePayloadSchema = flutterwaveData.extend({
  data: flutterwaveData.optional(),
});
const monerooData = z.looseObject({
  id: scalar,
  checkout_url: text,
  link: text,
  amount: scalar,
  status: text,
  currency: z.union([z.string().max(100), z.looseObject({ code: text })]).optional(),
});
export const monerooPayloadSchema = monerooData.extend({
  data: monerooData.optional(),
  event: text,
});
const chariowStatus = z.union([z.string().max(1000), z.looseObject({ value: text })]).optional();
const chariowAmount = z
  .union([z.number(), z.string().max(1000), z.looseObject({ value: scalar, currency: text })])
  .optional();
const chariowData = z.looseObject({
  id: scalar,
  amount: chariowAmount,
  currency: text,
  status: chariowStatus,
  step: text,
  purchase: z
    .looseObject({
      id: scalar,
      amount: z.looseObject({ value: scalar, currency: text }).optional(),
      status: chariowStatus,
    })
    .nullish(),
  payment: z.looseObject({ transaction_id: scalar, checkout_url: text }).nullish(),
});
// Chariow Pulse sends explicit `null` for blocks that do not apply (e.g. `"affiliate": null` on a sale
// without affiliate): they must be accepted, otherwise the webhook fails and credits are never granted.
export const chariowPayloadSchema = chariowData.extend({
  data: chariowData.nullish(),
  event: text,
  sale: entity.nullish(),
  license: entity.nullish(),
  affiliate: entity.nullish(),
});
const chariowProductPrice = z
  .union([z.number(), z.string().max(1000), z.looseObject({ value: scalar, currency: text })])
  .optional();
const chariowProductItem = z.looseObject({
  id: scalar,
  name: text,
  title: text,
  price: chariowProductPrice,
  currency: text,
});
export const chariowProductsPayloadSchema = z.looseObject({
  data: z.array(chariowProductItem).optional(),
  products: z.array(chariowProductItem).optional(),
});
export const fedapayPayloadSchema = z.looseObject({
  id: scalar,
  name: text,
  type: text,
  entity: entity.optional(),
  data: entity.optional(),
  object: entity.optional(),
});
const paydunyaData = z.looseObject({
  response_code: scalar,
  token: text,
  response_text: text,
  description: text,
  status: text,
  custom_data: metadata,
  customData: metadata,
  currency: text,
  hash: text,
  invoice_token: text,
  invoice: z
    .looseObject({
      total_amount: scalar,
      totalAmount: scalar,
      currency: text,
      token: text,
    })
    .optional(),
});
export const paydunyaPayloadSchema = paydunyaData.extend({
  data: paydunyaData.optional(),
});

/** Only payment summary fields are inspected; unknown provider fields are preserved.
 * Providers (Chariow) send `null` for blocks that do not apply and `status` as `{ value, label }`:
 * both must parse, otherwise reconciliation fails on every pass. */
const summaryText = text.nullable();
const summaryScalar = scalar.nullable();
const summaryMetadata = metadata.nullable();
const summaryStatus = z.union([z.string().max(10000), z.looseObject({ value: text })]).nullish();
const summaryData = z.looseObject({
  id: summaryScalar,
  transactionId: summaryScalar,
  chargeId: summaryScalar,
  token: summaryScalar,
  custom_metadata: summaryMetadata,
  metadata: summaryMetadata,
  custom_data: summaryMetadata,
  meta: summaryMetadata,
  tx_ref: summaryText,
  reference: summaryText,
  merchant_reference: summaryText,
  ref_command: summaryText,
  paymentReference: summaryText,
  status: summaryStatus,
  payment_status: summaryStatus,
  state: summaryStatus,
  settled_at: summaryScalar,
  paid_at: summaryScalar,
  completed_at: summaryScalar,
  updated_at: summaryScalar,
  created_at: summaryScalar,
  created_datetime: summaryScalar,
});
export const paymentSummarySchema = summaryData.extend({
  data: summaryData.nullish(),
  transaction: transaction.nullable(),
  entity: entity.nullish(),
  object: entity.nullish(),
  sale: entity.nullish(),
});
