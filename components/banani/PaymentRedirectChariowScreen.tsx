"use client";
const t = (text: string) => text;
import { useDemo } from "./DemoProvider";
import { formatDemoPackPrice } from "@/lib/demo/musikpro-data";

export const displayName = "Redirection Paiement Chariow";
export const screenSize = "mobile";

import Icon from "./Icon";

export default function PaymentRedirectScreen() {
  const demo = useDemo();
  return (
    <div className="bg-surface flex flex-col h-full justify-between">
      {/* Content - Centered */}
      <div className="flex-1 flex flex-col items-center justify-center px-4 text-center space-y-6">
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
          <h1 className="font-headings font-bold text-2xl text-foreground mb-2">
            {t("Redirection en cours…")}
          </h1>
          <p className="text-sm text-muted-foreground">
            {t(
              "Vous serez redirigé vers Chariow pour finaliser votre paiement",
            )}
          </p>
        </div>

        {/* Info Section */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 w-full space-y-2">
          <div className="flex items-start gap-2">
            <Icon
              i="info"
              size={16}
              className="text-blue-600 flex-shrink-0 mt-0.5"
            />
            <div className="text-left">
              <p className="text-xs font-semibold text-blue-900 mb-1">
                {t("Plateforme sécurisée")}
              </p>
              <p className="text-xs text-blue-800">
                {t(
                  "Chariow est notre partenaire de paiement de confiance. Vos informations sont protégées.",
                )}
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
              <p className="text-sm font-semibold text-foreground">
                {t("Effectuez votre paiement")}
              </p>
              <p className="text-xs text-muted-foreground">
                Montant : {formatDemoPackPrice(demo.pack.priceValue, demo.choices.currency)}
              </p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <div className="w-6 h-6 bg-muted text-muted-foreground rounded-full flex items-center justify-center flex-shrink-0 text-xs font-bold">
              2
            </div>
            <div>
              <p className="text-sm font-semibold text-foreground">
                {t("Revenez à Musika")}
              </p>
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
              <p className="text-sm font-semibold text-foreground">
                {t("Génération instantanée")}
              </p>
              <p className="text-xs text-muted-foreground">
                {t("Votre chanson sera générée automatiquement")}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="px-4 pb-6 space-y-3 border-t border-border">
        <p className="text-xs text-center text-muted-foreground">
          {t(
            "Si vous n'êtes pas redirigé automatiquement, cliquez sur le bouton ci-dessous",
          )}
        </p>
        <button
          type="button"
          data-demo-ready="true"
          onClick={() =>
            (() => {
              demo.setPaymentConfirmed(true);
              demo.go("/dashboard/payment-preview/confirmed");
            })()
          }
          className="w-full py-3 bg-primary text-primary-foreground font-semibold text-sm rounded-lg flex items-center justify-center gap-2"
        >
          <Icon i="external-link" size={16} /> {t("Simuler la confirmation")}
        </button>
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
