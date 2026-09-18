"use client";
const t = (text: string) => text;
import { useDemo } from "./DemoProvider";

export const displayName = "Crédits - Acheter des Chansons";
export const screenSize = "mobile";

import MobileTopBar from "./MobileTopBar";
import MobileBottomNav from "./MobileBottomNav";
import Icon from "./Icon";

const creditPacks = [
  {
    id: 1,
    name: t("Découverte"),
    credits: 1,
    price: "1 000 FCFA",
    priceValue: 1000,
    description: t("Parfait pour commencer"),
    popular: false,
    bonus: null,
  },
  {
    id: 2,
    name: t("Populaire"),
    credits: 3,
    price: "2 000 FCFA",
    priceValue: 2000,
    description: t("Meilleur rapport qualité-prix"),
    popular: true,
    bonus: t("+1 crédit offert"),
  },
  {
    id: 3,
    name: t("Maxi"),
    credits: 10,
    price: "5 000 FCFA",
    priceValue: 5000,
    description: t("Pour les gros créateurs"),
    popular: false,
    bonus: t("+2 crédits offerts"),
  },
  {
    id: 4,
    name: t("Illimité (1 mois)"),
    credits: null,
    price: "10 000 FCFA",
    priceValue: 10000,
    description: t("Créer autant que tu veux"),
    popular: false,
    bonus: t("Accès complet"),
  },
];

const transactionHistory = [
  {
    date: "20 juillet 2025",
    action: "Création chanson",
    credits: -1,
    type: "usage",
  },
  {
    date: "19 juillet 2025",
    action: "Achat pack Populaire",
    credits: +3,
    type: "purchase",
  },
  {
    date: "15 juillet 2025",
    action: "Création chanson",
    credits: -1,
    type: "usage",
  },
];

export default function CreditsMobile() {
  const demo = useDemo();
  return (
    <div className="bg-background flex flex-col">
      <MobileTopBar credits={3} />

      {/* Header */}
      <div className="px-4 pt-4 pb-4 flex items-center justify-between border-b border-border">
        <div>
          <h1 className="font-headings font-bold text-lg text-foreground">
            {t("Crédits")}
          </h1>
          <p className="text-xs text-muted-foreground">
            {t("Gère tes chansons")}
          </p>
        </div>
        <button
          type="button"
          data-demo-ready="true"
          onClick={() => demo.go("/dashboard")}
          aria-label="Fermer"
          className="text-muted-foreground"
        >
          <Icon i="x" size={20} />
        </button>
      </div>

      {/* Current Credits */}
      <div className="px-4 py-4">
        <div
          className="bg-gradient-to-br from-primary to-coral rounded-xl p-6 text-center text-primary-foreground"
          style={{ boxShadow: "0 4px 20px rgba(242,101,34,0.35)" }}
        >
          <p className="text-sm font-semibold mb-1 opacity-90">
            {t("Crédits disponibles")}
          </p>
          <p className="font-headings font-bold text-4xl mb-2">3</p>
          <p className="text-xs opacity-80">{t("= 3 chansons à créer")}</p>
        </div>
      </div>

      {/* Credit Packs */}
      <div className="px-4 py-4">
        <h2 className="font-bold text-base text-foreground mb-3">
          {t("Acheter des crédits")}
        </h2>
        <div className="flex flex-col gap-2">
          {creditPacks.map((pack) => (
            <button
              type="button"
              data-demo-ready="true"
              onClick={() =>
                demo.setPackIndex(
                  creditPacks.findIndex((p) => p.id === pack.id),
                )
              }
              aria-pressed={demo.pack.id === pack.id}
              key={pack.id}
              className={`relative rounded-xl p-4 border transition-all ${
                pack.popular
                  ? "bg-secondary border-primary/30 shadow-md"
                  : "bg-card border-border"
              }`}
            >
              {pack.popular && (
                <div className="absolute -top-2 -right-2 bg-primary text-primary-foreground text-xs font-bold px-2.5 py-1 rounded-lg">
                  {t("Populaire")}
                </div>
              )}

              <div className="flex items-start justify-between mb-2">
                <div className="text-left">
                  <h3
                    className={`font-bold text-sm ${pack.popular ? "text-primary" : "text-foreground"}`}
                  >
                    {pack.name}
                  </h3>
                  <p className="text-xs text-muted-foreground">
                    {pack.description}
                  </p>
                </div>
                {pack.credits && (
                  <div
                    className={`text-right ${pack.popular ? "text-primary" : "text-foreground"}`}
                  >
                    <p className="font-bold text-sm">{pack.credits}</p>
                    <p className="text-xs text-muted-foreground">
                      {t("crédits")}
                    </p>
                  </div>
                )}
              </div>

              {pack.bonus && (
                <div className="flex items-center gap-1 mb-2 text-xs text-success bg-green-50 px-2 py-1 rounded-lg w-fit">
                  <Icon i="gift" size={12} />
                  {pack.bonus}
                </div>
              )}

              <div className="flex items-center justify-between pt-2 border-t border-border/30">
                <span
                  className={`font-bold ${pack.popular ? "text-primary" : "text-foreground"}`}
                >
                  {pack.price}
                </span>
                <Icon
                  i="arrow-right"
                  size={14}
                  className="text-muted-foreground"
                />
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Transaction History */}
      <div className="px-4 py-4">
        <h2 className="font-bold text-base text-foreground mb-3">
          {t("Historique")}
        </h2>
        <div className="flex flex-col gap-0 bg-card border border-border rounded-xl overflow-hidden">
          {transactionHistory.map((tx, i) => (
            <div
              key={i}
              className={`flex items-center justify-between p-3 ${i > 0 ? "border-t border-border" : ""}`}
            >
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-foreground">
                  {tx.action}
                </p>
                <p className="text-xs text-muted-foreground">{tx.date}</p>
              </div>
              <span
                className={`text-sm font-bold ${tx.type === "purchase" ? "text-success" : "text-coral"}`}
              >
                {tx.type === "purchase" ? "+" : "-"}
                {Math.abs(tx.credits)}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* FAQ Section */}
      <div className="px-4 py-4">
        <div className="bg-secondary border border-primary/15 rounded-xl p-4">
          <div className="flex items-start gap-2">
            <Icon
              i="info"
              size={16}
              className="text-primary mt-0.5 flex-shrink-0"
            />
            <div>
              <p className="text-sm font-semibold text-foreground mb-1">
                {t("Comment fonctionnent les crédits ?")}
              </p>
              <p className="text-xs text-muted-foreground">
                {t(
                  "Chaque crédit = 1 chanson générée. Les crédits n'expirent jamais.",
                )}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Primary CTA */}
      <div className="px-4 pb-6 pt-2">
        <button
          type="button"
          data-demo-ready="true"
          onClick={() => demo.go("/dashboard/payment-preview")}
          className="w-full py-3 bg-primary text-primary-foreground rounded-lg font-semibold flex items-center justify-center gap-2"
        >
          <Icon i="zap" size={16} />
          {t("Acheter maintenant")}
        </button>
      </div>

      <MobileBottomNav activeTab={t("Profil")} />
    </div>
  );
}
