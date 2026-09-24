"use client";
import { useState } from "react";
import { parsePhoneNumberFromString, type CountryCode } from "libphonenumber-js";
import { translate as t } from "@/lib/i18n/translate";
import { useDemo } from "./DemoProvider";
import { formatDemoPackPrice } from "@/lib/demo/musikpro-data";
import { apiFetch } from "@/lib/api/client";

export const displayName = "Redirection Paiement Chariow";
export const screenSize = "mobile";

import Icon from "./Icon";

export default function PaymentRedirectScreen() {
  const demo = useDemo();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const startCheckout = async () => {
    if (!demo.pack || pending) return;
    if (demo.isDemo) {
      demo.setPaymentConfirmed(true);
      demo.go("/dashboard/payment-preview/confirmed");
      return;
    }
    setPending(true);
    setError("");
    try {
      const country = (demo.choices.phoneCountry || "CI").toUpperCase() as CountryCode;
      const parsedPhone = parsePhoneNumberFromString(demo.fields["payment.phone"] || "", country);
      if (!parsedPhone?.isValid()) throw new Error("Vérifie le pays et le numéro de téléphone avant de payer.");
      const origin = window.location.origin;
      const result = await apiFetch<{ checkoutUrl?: string }>("/api/payments/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          provider: "chariow",
          planId: demo.pack.id,
          country,
          phone: parsedPhone.number,
          phoneCountry: country,
          phoneLocal: parsedPhone.nationalNumber,
          successUrl: `${origin}/dashboard?payment=success`,
          cancelUrl: `${origin}/dashboard/create/pack?payment=cancelled`,
          couponCode: demo.coupon?.code,
        }),
      });
      if (!result.checkoutUrl) throw new Error("Chariow n’a pas retourné de page de paiement.");
      window.location.assign(result.checkoutUrl);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Le paiement Chariow n’a pas pu démarrer.");
      setPending(false);
    }
  };
  if (!demo.pack) {
    return (
      <div className="bg-surface flex min-h-full items-center justify-center px-4 py-12">
        <div className="w-full max-w-md rounded-3xl border border-border bg-card px-6 py-10 text-center">
          <Icon i="package-open" size={36} className="mx-auto mb-3 text-primary" />
          <h1 className="font-headings text-xl font-bold text-foreground">Aucune offre sélectionnée</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Choisis une offre de crédits avant de continuer vers le paiement.
          </p>
          <button
            type="button"
            onClick={() => demo.go("/dashboard/create/pack")}
            className="mt-6 rounded-xl bg-primary px-5 py-3 font-semibold text-primary-foreground"
          >
            Voir les crédits
          </button>
        </div>
      </div>
    );
  }
  return (
    <div className="bg-surface flex flex-col min-h-full justify-between">
      {/* Content - Centered */}
      <div className="flex-1 flex flex-col items-center justify-center px-4 pt-10 pb-4 text-center space-y-6">
        {/* Loading Animation */}
        <div className="relative w-20 h-20">
          <div className="absolute inset-0 border-4 border-muted rounded-full" />
          <div
            className="absolute inset-0 border-4 border-transparent border-t-primary rounded-full animate-spin"
            style={{ animation: "spin 2s linear infinite" }}
          />
        </div>

        {/* Title */}
        <div>
          <h1 className="font-headings font-bold text-2xl text-foreground mb-2">{t("Redirection en cours…")}</h1>
          <p className="text-sm text-muted-foreground">
            {t("Vous serez redirigé vers Chariow pour finaliser votre paiement")}
          </p>
        </div>

        {/* Info Section */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 w-full space-y-2">
          <div className="flex items-start gap-2">
            <Icon i="info" size={16} className="text-blue-600 flex-shrink-0 mt-0.5" />
            <div className="text-left">
              <p className="text-xs font-semibold text-blue-900 mb-1">{t("Plateforme sécurisée")}</p>
              <p className="text-xs text-blue-800">
                {t("Chariow est notre partenaire de paiement de confiance. Vos informations sont protégées.")}
              </p>
            </div>
          </div>
        </div>

        {/* Steps */}
        <div className="w-full space-y-3 text-left">
          <div className="flex items-start gap-3">
            <div className="w-6 h-6 bg-primary text-primary-foreground rounded-full flex items-center justify-center flex-shrink-0 text-xs font-bold">
              1
            </div>
            <div>
              <p className="text-sm font-semibold text-foreground">{t("Effectuez votre paiement")}</p>
              <p className="text-xs text-muted-foreground">
                Montant :{" "}
                {formatDemoPackPrice(demo.coupon?.finalAmount ?? demo.pack.priceValue, demo.choices.currency)}
                {demo.coupon ? ` (code ${demo.coupon.code} appliqué)` : ""}
              </p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <div className="w-6 h-6 bg-muted text-muted-foreground rounded-full flex items-center justify-center flex-shrink-0 text-xs font-bold">
              2
            </div>
            <div>
              <p className="text-sm font-semibold text-foreground">{t("Revenez à MusikPro")}</p>
              <p className="text-xs text-muted-foreground">
                {t("Vous serez automatiquement redirigé après le paiement")}
              </p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <div className="w-6 h-6 bg-muted text-muted-foreground rounded-full flex items-center justify-center flex-shrink-0 text-xs font-bold">
              3
            </div>
            <div>
              <p className="text-sm font-semibold text-foreground">{t("Génération instantanée")}</p>
              <p className="text-xs text-muted-foreground">{t("Votre chanson sera générée automatiquement")}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="px-4 pb-6 space-y-3 border-t border-border">
        <p className="text-xs text-center text-muted-foreground">
          {t("Si vous n'êtes pas redirigé automatiquement, cliquez sur le bouton ci-dessous")}
        </p>
        <button
          type="button"
          data-demo-ready="true"
          onClick={startCheckout}
          disabled={pending}
          className="w-full py-3 bg-primary text-primary-foreground font-semibold text-sm rounded-lg flex items-center justify-center gap-2"
        >
          <Icon i="external-link" size={16} /> {pending ? t("Connexion à Chariow…") : demo.isDemo ? t("Simuler la confirmation") : t("Payer avec Chariow")}
        </button>
        {error && <p role="alert" className="text-sm text-red-700">{error}</p>}
        <button
          type="button"
          data-demo-ready="true"
          onClick={() => demo.go("/dashboard")}
          className="w-full py-3 bg-secondary text-primary font-semibold text-sm rounded-lg"
        >
          {t("Annuler")}
        </button>
      </div>

      {/* CSS Animation */}
      <style>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}
