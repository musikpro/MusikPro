"use client";
const t = (text: string) => text;
import { useDemo } from "./DemoProvider";

import DemoField from "./DemoField";
import { demoSupportSchema } from "@/lib/validation/musikpro-demo";

export const displayName = "Contacter le support";
export const screenSize = "mobile";

import Icon from "./Icon";

export default function ContactSupportScreen() {
  const demo = useDemo();
  return (
    <div className="bg-background flex flex-col">
      {/* Top Nav */}
      <div className="bg-background border-b border-border px-4 py-3 flex items-center justify-between">
        <button
          type="button"
          data-demo-ready="true"
          onClick={() => demo.go("/dashboard/help")}
          className="flex items-center gap-1.5 text-sm font-semibold text-foreground"
        >
          <Icon i="arrow-left" size={18} /> {t("Retour")}
        </button>
        <h1 className="text-sm font-medium text-muted-foreground">
          {t("Contacter le support")}
        </h1>
      </div>

      {/* Content */}
      <div className="flex-1 px-4 py-6 overflow-y-auto space-y-6">
        {/* Header */}
        <div>
          <h2 className="font-headings font-bold text-xl text-foreground mb-2">
            {t("Nous sommes ici pour vous aider")}
          </h2>
          <p className="text-sm text-muted-foreground">
            {t(
              "Décrivez votre problème et notre équipe vous répondra rapidement.",
            )}
          </p>
        </div>

        {/* Subject */}
        <div>
          <label className="text-xs font-bold text-muted-foreground uppercase block mb-2">
            {t("Sujet")}
          </label>
          <div className="border border-border rounded-lg px-3 py-3 bg-input flex items-center gap-2">
            <Icon i="mail" size={16} className="text-muted-foreground" />
            <DemoField
              name="support.subject"
              label="Sujet"
              placeholder="Sélectionner un sujet..."
              multiline={false}
              type="text"
              maxLength={254}
            />
          </div>
        </div>

        {/* Category */}
        <div>
          <label className="text-xs font-bold text-muted-foreground uppercase block mb-2">
            {t("Catégorie")}
          </label>
          <div className="border border-border rounded-lg px-3 py-3 bg-input flex items-center gap-2">
            <Icon i="list" size={16} className="text-muted-foreground" />
            <select
              className="demo-field text-sm"
              aria-label="Catégorie"
              value={demo.fields["support.category"]}
              onChange={(e) => demo.field("support.category", e.target.value)}
            >
              {["Problème technique", "Compte", "Crédits"].map((s) => (
                <option key={s}>{s}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Message */}
        <div>
          <label className="text-xs font-bold text-muted-foreground uppercase block mb-2">
            {t("Votre message")}
          </label>
          <div className="border border-border rounded-lg px-3 py-3 bg-input min-h-32">
            <DemoField
              name="support.message"
              label="Votre message"
              placeholder="Décrivez votre problème en détail..."
              multiline={true}
              type="text"
              maxLength={5000}
            />
          </div>
        </div>

        {/* Contact Info */}
        <div className="space-y-3">
          <h3 className="text-xs font-bold text-muted-foreground uppercase">
            {t("Nous pouvons aussi vous contacter")}
          </h3>
          <div>
            <label className="text-xs font-medium text-foreground block mb-2">
              {t("Email")}
            </label>
            <div className="border border-border rounded-lg px-3 py-3 bg-input">
              <DemoField
                name="support.email"
                label="Email"
                placeholder="amelie.kouassi@example.com"
                multiline={false}
                type="email"
                maxLength={254}
              />
            </div>
          </div>
          <div>
            <label className="text-xs font-medium text-foreground block mb-2">
              {t("Téléphone (optionnel)")}
            </label>
            <div className="border border-border rounded-lg px-3 py-3 bg-input flex items-center gap-2">
              <Icon i="phone" size={16} className="text-muted-foreground" />
              <DemoField
                name="support.phone"
                label="Téléphone"
                placeholder="+225 XX XX XX XX"
                multiline={false}
                type="tel"
                maxLength={254}
              />
            </div>
          </div>
        </div>

        {/* Info Box */}
        <div className="bg-secondary/40 border border-secondary rounded-xl p-4">
          <div className="flex items-start gap-2">
            <Icon
              i="info"
              size={16}
              className="text-primary flex-shrink-0 mt-0.5"
            />
            <p className="text-xs text-muted-foreground">
              {t(
                "Notre équipe vous répondra dans les 24 heures. Assurez-vous que vos informations de contact sont correctes.",
              )}
            </p>
          </div>
        </div>
      </div>

      {/* CTA */}
      <div className="px-4 py-4 bg-background space-y-2 border-t border-border">
        <button
          type="button"
          data-demo-ready="true"
          onClick={() =>
            (() => {
              const parsed = demoSupportSchema.safeParse({
                subject: demo.fields["support.subject"],
                category: demo.fields["support.category"],
                message: demo.fields["support.message"],
                email: demo.fields["support.email"],
                phone: demo.fields["support.phone"],
              });
              demo.notify(
                parsed.success
                  ? "Message enregistré dans la démonstration. Aucun message envoyé."
                  : "Complète le sujet, un message de 10 caractères minimum et un email valide.",
              );
            })()
          }
          className="w-full py-4 bg-primary text-primary-foreground font-bold text-base rounded-xl"
          style={{ boxShadow: "0 4px 16px rgba(242,101,34,0.35)" }}
        >
          {t("Envoyer mon message")}
        </button>
        <button
          type="button"
          data-demo-ready="true"
          onClick={() => demo.go("/dashboard/help")}
          className="w-full py-3 bg-secondary text-primary font-semibold text-base rounded-xl border border-primary/30"
        >
          {t("Annuler")}
        </button>
      </div>
    </div>
  );
}
