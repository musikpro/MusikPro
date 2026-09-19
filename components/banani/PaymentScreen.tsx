"use client";
const t = (text: string) => text;
import { useDemo } from "./DemoProvider";
import { formatDemoPackPrice } from "@/lib/demo/musikpro-data";

import DemoField from "./DemoField";
import { demoPaymentSchema } from "@/lib/validation/musikpro-demo";

export const displayName = "Page de Paiement";
export const screenSize = "mobile";

import Icon from "./Icon";

export default function PaymentScreen() {
  const demo = useDemo();
  return (
    <div className="bg-surface flex flex-col h-full">
      {/* Top Nav */}
      <div className="bg-background border-b border-border px-4 py-3 flex items-center">
        <button
          type="button"
          data-demo-ready="true"
          onClick={() => demo.go("/dashboard/credits")}
          className="flex items-center gap-1.5 text-sm font-semibold text-foreground"
        >
          <Icon i="arrow-left" size={18} /> {t("Retour")}
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 px-4 py-6 overflow-y-auto space-y-6">
        {/* Title */}
        <div>
          <h1 className="font-headings font-bold text-2xl text-foreground mb-2">
            {t("Finalisez votre paiement")}
          </h1>
          <p className="text-sm text-muted-foreground">
            {t("Remplissez vos informations pour générer votre chanson")}
          </p>
        </div>

        {/* Form Section - Highlighted Box */}
        <div className="bg-card border-2 border-primary/20 rounded-xl p-5 space-y-4">
          <h3 className="text-sm font-bold text-foreground mb-4">
            {t("Vos informations")}
          </h3>

          {/* Name Field */}
          <div>
            <label className="text-xs font-bold text-muted-foreground uppercase mb-2 block">
              {t("Nom complet")}
            </label>
            <div className="border border-border rounded-lg px-3 py-3 bg-background flex items-center gap-2">
              <Icon
                i="user"
                size={16}
                className="text-muted-foreground flex-shrink-0"
              />
              <DemoField
                name="payment.name"
                label="Nom complet"
                type="text"
                placeholder="Jean Dupont"
                maxLength={254}
              />
            </div>
          </div>

          {/* Email Field */}
          <div>
            <label className="text-xs font-bold text-muted-foreground uppercase mb-2 block">
              {t("Email")}
            </label>
            <div className="border border-border rounded-lg px-3 py-3 bg-background flex items-center gap-2">
              <Icon
                i="mail"
                size={16}
                className="text-muted-foreground flex-shrink-0"
              />
              <DemoField
                name="payment.email"
                label="Email"
                type="email"
                placeholder="jean@example.com"
                maxLength={254}
              />
            </div>
          </div>

          {/* Phone Field */}
          <div>
            <label className="text-xs font-bold text-muted-foreground uppercase mb-2 block">
              {t("Numéro de téléphone")}
            </label>
            <div className="flex gap-2 items-center">
              {/* Country Code with Flag - Clickable */}
              <button
                type="button"
                data-demo-ready="true"
                onClick={() =>
                  demo.notify(
                    "Action de démonstration : aucune opération réelle effectuée.",
                  )
                }
                className="border border-border rounded-lg px-2 py-2 bg-background flex items-center gap-1.5 flex-shrink-0"
              >
                <span className="text-base">🇨🇮</span>
                <p className="text-xs font-semibold text-foreground">
                  {t("+225")}
                </p>
                <Icon
                  i="chevron-down"
                  size={14}
                  className="text-muted-foreground"
                />
              </button>
              {/* Phone Number Input - Masked 2-2-2-2-2 */}
              <div className="flex-1 border border-border rounded-lg px-3 py-2 bg-background">
                <DemoField
                  name="payment.phone"
                  label="Numéro de téléphone"
                  type="tel"
                  placeholder="XX XX XX XX XX"
                  maxLength={10}
                  className="text-sm font-mono tracking-wide"
                />
              </div>
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              {t("10 chiffres requis")}
            </p>
          </div>
        </div>

        {/* Pricing Info - Highlighted Box */}
        <div className="bg-card border-2 border-primary/20 rounded-xl p-5 space-y-3">
          <h3 className="text-sm font-bold text-foreground mb-4">
            {t("Résumé de commande")}
          </h3>

          <div className="flex justify-between items-center pb-3 border-b border-border">
            <span className="text-sm font-medium text-foreground">
              {demo.pack.name}
            </span>
            <span className="text-sm font-semibold text-foreground">
              {demo.pack.songs === null
                ? "Chansons illimitées"
                : `${demo.pack.songs} chansons`}{" "}
              · pack de démonstration
            </span>
          </div>

          <div className="flex justify-between items-center pt-2">
            <span className="text-base font-bold text-foreground">
              {t("Total")}
            </span>
            <span className="text-2xl font-bold text-primary">
              {formatDemoPackPrice(demo.pack.priceValue, demo.choices.currency)}
            </span>
          </div>

          <div className="flex items-center gap-2 pt-3 border-t border-border">
            <Icon
              i="shield-check"
              size={16}
              className="text-success flex-shrink-0"
            />
            <p className="text-xs text-muted-foreground">
              {t("Paiement 100% sécurisé")}
            </p>
          </div>
        </div>

        {/* Payment Method Info */}
        <div className="bg-card border border-border rounded-lg p-3">
          <div className="flex items-start gap-2">
            <Icon
              i="info"
              size={16}
              className="text-primary flex-shrink-0 mt-0.5"
            />
            <p className="text-xs text-muted-foreground">
              {t(
                "Vous recevrez un lien de paiement mobile money par SMS pour finaliser votre achat.",
              )}
            </p>
          </div>
        </div>
      </div>

      {/* CTA */}
      <div className="px-4 pb-8 border-t border-border bg-background space-y-3">
        <button
          type="button"
          data-demo-ready="true"
          onClick={() =>
            (() => {
              const parsed = demoPaymentSchema.safeParse({
                name: demo.fields["payment.name"],
                email: demo.fields["payment.email"],
                phone: demo.fields["payment.phone"],
              });
              if (!parsed.success) {
                demo.notify(
                  "Vérifie les informations et saisis 10 chiffres pour le téléphone.",
                );
                return;
              }
              demo.go("/dashboard/payment-preview/chariow");
            })()
          }
          className="w-full py-4 bg-primary text-primary-foreground font-bold text-base rounded-xl flex items-center justify-center gap-2"
          style={{ boxShadow: "0 4px 16px rgba(242,101,34,0.35)" }}
        >
          {t("Confirmer le paiement")} <Icon i="check" size={18} />
        </button>
        <button
          type="button"
          data-demo-ready="true"
          onClick={() => demo.go("/dashboard/credits")}
          className="w-full py-3 bg-secondary text-primary font-semibold text-base rounded-xl border border-primary/30"
        >
          {t("Annuler")}
        </button>
      </div>
    </div>
  );
}
