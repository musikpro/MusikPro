import type { PaymentProvider, PaymentProviderId } from "./types";
import { ChariowProvider } from "./providers/chariow";
import { FedapayProvider } from "./providers/fedapay";
import { DjomyProvider } from "./providers/djomy";
import { PaydunyaProvider } from "./providers/paydunya";
import { FlutterwaveProvider } from "./providers/flutterwave";
import { MonerooProvider } from "./providers/moneroo";
import { StripeProvider } from "./providers/stripe";
import { PaytechProvider } from "./providers/paytech";
import { BictorysProvider } from "./providers/bictorys";

const providers: Record<PaymentProviderId, PaymentProvider> = {
  chariow: new ChariowProvider(),
  fedapay: new FedapayProvider(),
  djomy: new DjomyProvider(),
  paydunya: new PaydunyaProvider(),
  flutterwave: new FlutterwaveProvider(),
  moneroo: new MonerooProvider(),
  paytech: new PaytechProvider(),
  bictorys: new BictorysProvider(),
  stripe: new StripeProvider(),
};

export function getPaymentProvider(id?: string) {
  const selected = (id || process.env.PAYMENT_DEFAULT_PROVIDER || "chariow") as PaymentProviderId;
  const provider = providers[selected];
  if (!provider) throw new Error(`Unknown payment provider: ${selected}`);
  return provider;
}

export function recommendProviders(country: string): PaymentProviderId[] {
  const map: Record<string, PaymentProviderId[]> = {
    CI: ["paydunya", "fedapay", "chariow", "bictorys", "paytech", "flutterwave", "moneroo"],
    SN: ["paydunya", "paytech", "bictorys", "flutterwave", "moneroo"],
    BJ: ["fedapay", "paydunya", "paytech", "moneroo"],
    TG: ["paydunya", "moneroo"],
    BF: ["paydunya", "flutterwave", "moneroo"],
    CM: ["flutterwave", "moneroo"],
    NG: ["flutterwave", "moneroo", "stripe"],
  };
  return map[country.toUpperCase()] ?? ["moneroo", "flutterwave", "stripe"];
}
