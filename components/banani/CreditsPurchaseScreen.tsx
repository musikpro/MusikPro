"use client";
const t = (text: string) => text;
import Image from "next/image";
import { demoCurrencies, demoSongPacks, formatDemoPackPrice } from "@/lib/demo/musikpro-data";
import { useDemo } from "./DemoProvider";

export const displayName = "Packs - Acheter des Chansons";
export const screenSize = "mobile";

import MobileTopBar from "./MobileTopBar";
import MobileBottomNav from "./MobileBottomNav";
import Icon from "./Icon";
import MusikSelect from "./MusikSelect";

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
      <MobileTopBar credits={demo.balance} />

      {/* Header */}
      <div className="px-4 pt-4 pb-4 flex items-center justify-between border-b border-border">
        <div>
          <h1 className="font-headings font-bold text-lg text-foreground">{t("Packs de chansons")}</h1>
          <p className="text-xs text-muted-foreground">{t("Gère tes chansons")}</p>
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
        <div className="song-balance-card">
          <div className="song-balance-heading">
            <span className="song-balance-icon" aria-hidden="true">
              <Icon i="music" size={18} />
            </span>
            <span>{t("Votre solde")}</span>
          </div>
          <div className="song-balance-total">
            <strong>{demo.balance}</strong>
            <span>{t("chansons disponibles")}</span>
          </div>
          <div className="song-balance-message">
            <Icon i="check" size={16} />
            <span>
              {demo.balance > 0 ? (
                <>
                  {t("Vous pouvez créer")} <strong>{demo.balance} {t("nouvelles chansons")}</strong>
                </>
              ) : (
                t("Choisissez un pack pour commencer à créer")
              )}
            </span>
          </div>
        </div>
      </div>

      {/* Credit Packs */}
      <div className="px-4 py-4">
        <div className="pack-purchase-heading">
          <h2 className="font-bold text-base text-foreground">{t("Acheter des chansons")}</h2>
          <MusikSelect
            className="pack-currency-select"
            icon="coins"
            ariaLabel="Devise"
            showOptionDisplays={false}
            showSelectionMark={false}
            value={demo.choices.currency}
            onChange={(value) => demo.choose("currency", value)}
            options={demoCurrencies.map((currency) => ({
              value: currency.code,
              label: currency.label,
              display: currency.symbol,
            }))}
          />
        </div>
        <div className="pack-grid">
          {demoSongPacks.map((pack) => {
            const isSelected = demo.pack.id === pack.id;
            return (
              <button
                type="button"
                data-demo-ready="true"
                onClick={() => demo.setPackIndex(demoSongPacks.findIndex((p) => p.id === pack.id))}
                aria-pressed={demo.pack.id === pack.id}
                key={pack.id}
                className={`demo-choice-card pack-choice-card relative rounded-xl border transition-all ${
                  isSelected ? "bg-secondary border-primary shadow-md" : "bg-card border-border"
                }`}
              >
                {pack.popular && <span className="pack-popular-badge">{t("Populaire")}</span>}

                <div className="pack-grid-card-heading">
                  <div>
                    <h3 className={`font-bold text-sm ${isSelected ? "text-primary" : "text-foreground"}`}>
                      {pack.name}
                    </h3>
                    <p className="text-xs text-muted-foreground">{pack.description}</p>
                  </div>
                  <div className={`pack-grid-song-count ${isSelected ? "text-primary" : "text-foreground"}`}>
                    <strong>{pack.songs ?? "∞"}</strong>
                    <span>{pack.songs === 1 ? t("chanson") : t("chansons")}</span>
                  </div>
                </div>

                {pack.bonus && (
                  <span className="pack-grid-bonus">
                    <Icon i="gift" size={12} />
                    {pack.bonus}
                  </span>
                )}

                <div className="pack-grid-card-footer">
                  <span className={`font-bold ${isSelected ? "text-primary" : "text-foreground"}`}>
                    {formatDemoPackPrice(pack.priceValue, demo.choices.currency)}
                  </span>
                  <span className="pack-grid-card-status">
                    {demo.pack.id === pack.id ? (
                      <>
                        <Icon i="check" size={15} /> <span>Sélectionné</span>
                      </>
                    ) : (
                      <Icon i="arrow-right" size={14} />
                    )}
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* FAQ Section */}
      <div className="px-4 py-4">
        <div className="bg-secondary border border-primary/15 rounded-xl p-4">
          <div className="flex items-start gap-2">
            <Icon i="info" size={16} className="text-primary mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-sm font-semibold text-foreground mb-1">{t("Comment choisir un pack ?")}</p>
              <p className="text-xs text-muted-foreground">
                {t("Choisissez votre pack selon le nombre de chansons que vous souhaitez créer.")}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Primary CTA */}
      <div className="pack-checkout-section px-4 pb-4 pt-2">
        <button
          type="button"
          data-demo-ready="true"
          onClick={() => demo.go("/dashboard/payment-preview")}
          className="w-full py-3 bg-primary text-primary-foreground rounded-lg font-semibold flex items-center justify-center gap-2"
        >
          <Icon i="zap" size={16} />
          {t("Acheter des chansons")}
        </button>
        <div className="pack-payment-methods" aria-label="Moyens de paiement acceptés">
          <p>Moyens de paiement acceptés</p>
          <div className="pack-payment-logos">
            <span className="payment-logo payment-logo-orange-money" title="Orange Money">
              <Image src="/banani/payment-logos/orange-money.png" alt="Orange Money" width={132} height={36} />
            </span>
            <span className="payment-logo payment-logo-mtn-momo" title="MTN MoMo">
              <Image src="/banani/payment-logos/mtn-momo.png" alt="MTN MoMo" width={96} height={45} />
            </span>
            <span className="payment-logo payment-logo-moov-money" title="Moov Money">
              <Image src="/banani/payment-logos/moov-money.png" alt="Moov Money" width={54} height={54} />
            </span>
            <span className="payment-logo payment-logo-wave-money" title="Wave">
              <Image src="/banani/payment-logos/wave.png" alt="Wave" width={96} height={42} />
            </span>
            <span className="payment-logo payment-logo-card" title="Carte bancaire Visa ou Mastercard">
              <Image src="/banani/payment-logos/visa.svg" alt="Visa" width={44} height={15} />
              <Image src="/banani/payment-logos/mastercard.svg" alt="Mastercard" width={31} height={24} />
            </span>
          </div>
        </div>
      </div>

      {/* Transaction History */}
      <div className="pack-history-section px-4 pt-5 pb-6">
        <h2 className="font-bold text-base text-foreground mb-3">{t("Historique")}</h2>
        <div className="flex flex-col gap-0 bg-card border border-border rounded-xl overflow-hidden">
          {transactionHistory.map((tx, i) => (
            <div key={i} className={`flex items-center justify-between p-3 ${i > 0 ? "border-t border-border" : ""}`}>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-foreground">{tx.action}</p>
                <p className="text-xs text-muted-foreground">{tx.date}</p>
              </div>
              <span className={`text-sm font-bold ${tx.type === "purchase" ? "text-success" : "text-coral"}`}>
                {tx.type === "purchase" ? "+" : "-"}
                {Math.abs(tx.songs)} chanson{Math.abs(tx.songs) > 1 ? "s" : ""}
              </span>
            </div>
          ))}
        </div>
      </div>

      <MobileBottomNav activeTab={t("Profil")} />
    </div>
  );
}
