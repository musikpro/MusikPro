"use client";
const t = (text: string) => text;
import { demoSongPacks } from "@/lib/demo/musikpro-data";
import { useDemo } from "./DemoProvider";

export const displayName = "Packs - Acheter des Chansons";
export const screenSize = "mobile";

import MobileTopBar from "./MobileTopBar";
import MobileBottomNav from "./MobileBottomNav";
import Icon from "./Icon";

const transactionHistory = [
  {
    date: "20 juillet 2025",
    action: "Création chanson",
    songs: -1,
    type: "usage",
  },
  {
    date: "19 juillet 2025",
    action: "Achat pack Populaire",
    songs: +5,
    type: "purchase",
  },
  {
    date: "15 juillet 2025",
    action: "Création chanson",
    songs: -1,
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
            {t("Packs de chansons")}
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
            {t("Chansons disponibles")}
          </p>
          <p className="font-headings font-bold text-4xl mb-2">3</p>
          <p className="text-xs opacity-80">{t("= 3 chansons à créer")}</p>
        </div>
      </div>

      {/* Credit Packs */}
      <div className="px-4 py-4">
        <h2 className="font-bold text-base text-foreground mb-3">
          {t("Acheter des chansons")}
        </h2>
        <div className="flex flex-col gap-2">
          {demoSongPacks.map((pack) => (
            <button
              type="button"
              data-demo-ready="true"
              onClick={() =>
                demo.setPackIndex(
                  demoSongPacks.findIndex((p) => p.id === pack.id),
                )
              }
              aria-pressed={demo.pack.id === pack.id}
              key={pack.id}
              className={`demo-choice-card relative rounded-xl p-4 border transition-all ${
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
                {
                  <div
                    className={`text-right ${pack.popular ? "text-primary" : "text-foreground"}`}
                  >
                    <p className="font-bold text-sm">
                      {pack.songs ?? "Illimité"}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {t("chansons")}
                    </p>
                  </div>
                }
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
                <span className="flex items-center gap-1 text-xs font-semibold text-primary">
                  {demo.pack.id === pack.id ? (
                    <>
                      <Icon i="check" size={16} /> Sélectionné
                    </>
                  ) : (
                    <Icon i="arrow-right" size={14} />
                  )}
                </span>
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
                {Math.abs(tx.songs)} chanson{Math.abs(tx.songs) > 1 ? "s" : ""}
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
                {t("Comment choisir un pack ?")}
              </p>
              <p className="text-xs text-muted-foreground">
                {t(
                  "Choisissez votre pack selon le nombre de chansons que vous souhaitez créer.",
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
