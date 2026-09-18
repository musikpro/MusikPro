import type { PaymentProviderId } from "./types";
export type ProviderReadiness="production"|"beta"|"merchant-validation"|"scaffold";
export const providerCapabilities:Record<PaymentProviderId,{readiness:ProviderReadiness; checkout:boolean; webhook:boolean; verify:boolean; methods:string[]; note:string}>={
 fedapay:{readiness:"production",checkout:true,webhook:true,verify:true,methods:["mobile_money","card"],note:"Server checkout + signed webhook + API re-verification."},
 chariow:{readiness:"production",checkout:true,webhook:true,verify:true,methods:["mobile_money","card"],note:"Checkout API + Pulses; requires plan→Chariow product mapping and customer phone."},
 flutterwave:{readiness:"beta",checkout:true,webhook:true,verify:true,methods:["mobile_money","card"],note:"Hosted checkout + signed webhook. Validate against your Flutterwave account/API version before live launch."},
 paydunya:{readiness:"production",checkout:true,webhook:true,verify:true,methods:["wave","orange_money","mtn","moov","mobile_money","card"],note:"Checkout Invoice + token confirmation + IPN SHA-512 MasterKey verification. Hosted checkout is the safest default."},
 djomy:{readiness:"merchant-validation",checkout:false,webhook:false,verify:false,methods:["mobile_money","card"],note:"Official developer portal exists, but public indexed technical details are insufficient for a safe production adapter. Keep disabled until merchant credentials/docs confirm endpoints and webhook verification."},
 moneroo:{readiness:"production",checkout:true,webhook:true,verify:true,methods:["mobile_money","card"],note:"Hosted checkout + HMAC X-Moneroo-Signature + API re-verification."},
 paytech:{readiness:"beta",checkout:true,webhook:true,verify:true,methods:["wave","orange_money","free_money","mobile_money","card"],note:"Hosted checkout + form/JSON IPN + HMAC/SHA256-key validation; run merchant sandbox tests before live."},
 bictorys:{readiness:"beta",checkout:true,webhook:true,verify:true,methods:["mobile_money","card"],note:"Charges API + X-Secret-Key/HMAC webhook validation. Account/operator availability must be tested before live."},
 stripe:{readiness:"scaffold",checkout:false,webhook:false,verify:false,methods:["card"],note:"Optional international adapter."},
};

export function providerRuntimeMode(provider: PaymentProviderId): "sandbox" | "live" | "unknown" {
  switch (provider) {
    case "fedapay": return process.env.FEDAPAY_ENVIRONMENT === "live" ? "live" : "sandbox";
    case "paydunya": return process.env.PAYDUNYA_ENVIRONMENT === "live" ? "live" : "sandbox";
    case "flutterwave": return process.env.FLUTTERWAVE_ENVIRONMENT === "live" ? "live" : "sandbox";
    case "paytech": return process.env.PAYTECH_ENVIRONMENT === "prod" ? "live" : "sandbox";
    case "bictorys": return process.env.BICTORYS_ENVIRONMENT === "live" ? "live" : "sandbox";
    default: return "unknown";
  }
}

export function providerRuntimeAllowed(provider: PaymentProviderId) {
  const capability = providerCapabilities[provider];
  if (["scaffold", "merchant-validation"].includes(capability.readiness)) return false;
  // Beta adapters are intentionally sandbox-only until merchant validation promotes them.
  if (capability.readiness === "beta" && providerRuntimeMode(provider) === "live") return false;
  return true;
}
