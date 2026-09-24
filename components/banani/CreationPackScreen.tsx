"use client";

import Image from "next/image";
import { useState } from "react";
import { demoCurrencies, formatDemoPackPrice } from "@/lib/demo/musikpro-data";
import { apiFetch } from "@/lib/api/client";
import CreationTopNav from "./CreationTopNav";
import Icon from "./Icon";
import MusikSelect from "./MusikSelect";
import { useDemo } from "./DemoProvider";
import { CREDITS_PER_GENERATION, getGenerationCount, getVersionCount } from "@/lib/credit-plans/catalog";

export const displayName = "Choix de l’offre de crédits";
export const screenSize = "mobile";

import { translate as t } from "@/lib/i18n/translate";

type CouponApplyResult = {
  valid: boolean;
  reason?: string;
  code?: string;
  discountAmount?: number;
  finalAmount?: number;
};

export default function CreationPackScreen() {
  const demo = useDemo();
  const [couponInput, setCouponInput] = useState("");
  const [couponPending, setCouponPending] = useState(false);
  const [couponError, setCouponError] = useState("");

  const applyCoupon = async () => {
    const code = couponInput.trim();
    if (!code || !demo.pack || demo.isDemo) return;
    setCouponPending(true);
    setCouponError("");
    try {
      const result = await apiFetch<CouponApplyResult>("/api/payments/coupons/apply", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code, planId: demo.pack.id }),
        timeoutMs: 15_000,
      });
      if (!result.valid || result.discountAmount == null) {
        demo.setCoupon(null);
        setCouponError(result.reason || "Code promo invalide.");
        return;
      }
      demo.setCoupon({ code: result.code ?? code, discountAmount: result.discountAmount, finalAmount: result.finalAmount ?? 0 });
    } catch {
      setCouponError("Impossible de vérifier ce code pour le moment.");
    } finally {
      setCouponPending(false);
    }
  };

  const clearCoupon = () => {
    demo.setCoupon(null);
    setCouponInput("");
    setCouponError("");
  };

  return (
    <div className="creation-pack-screen bg-surface flex flex-col">
      <CreationTopNav backHref="/dashboard/payment-preview" label="Choix des crédits" />

      <div className="creation-pack-content">
        <header className="creation-pack-heading">
          <div>
            <span className="creation-pack-kicker">
              <Icon i="music-2" size={16} />
              {CREDITS_PER_GENERATION} crédits · une génération · deux versions
            </span>
            <h1>{t("Choisis tes crédits")}</h1>
            <p>{t("Sélectionne l’offre adaptée au nombre de générations souhaité.")}</p>
          </div>
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
        </header>

        <section className="checkout-information-card creation-pack-panel" aria-labelledby="creation-pack-panel-title">
          <div className="checkout-card-heading">
            <span className="checkout-card-icon" aria-hidden="true">
              <Icon i="package-open" size={21} />
            </span>
            <div>
              <h2 id="creation-pack-panel-title">{t("Offres de crédits")}</h2>
              <p>{t("Chaque génération musicale consomme 2 crédits et produit deux versions.")}</p>
            </div>
          </div>

          <div className="creation-pack-list" role="radiogroup" aria-label="Offres de crédits disponibles">
            {demo.songPacks.length === 0 && (
              <div className="creation-pack-card is-empty">
                <span className="creation-pack-card-main">
                  <strong>{t("Aucune offre disponible")}</strong>
                  <small>{t("Les offres de crédits publiées apparaîtront ici.")}</small>
                </span>
              </div>
            )}
            {demo.songPacks.map((pack) => {
              const selected = demo.pack?.id === pack.id;
              return (
                <button
                  type="button"
                  role="radio"
                  aria-checked={selected}
                  data-demo-ready="true"
                  key={pack.id}
                  onClick={() => {
                    demo.setPackIndex(demo.songPacks.findIndex((item) => item.id === pack.id));
                    if (!selected) clearCoupon();
                  }}
                  className={`creation-pack-card${selected ? " is-selected" : ""}`}
                >
                  <span className="creation-pack-card-main">
                    <span className="creation-pack-card-title">
                      <strong>{pack.name}</strong>
                      {pack.popular && <em>{t("Populaire")}</em>}
                    </span>
                    <small>{pack.description}</small>
                    {pack.bonus && (
                      <span className="creation-pack-bonus">
                        <Icon i="gift" size={13} />
                        {pack.bonus}
                      </span>
                    )}
                  </span>
                  <span className="creation-pack-card-value">
                    <strong>{pack.credits}</strong>
                    <small>crédits</small>
                    <small>
                      {getGenerationCount(pack.credits, pack.generationCost)} générations ·{" "}
                      {getVersionCount(pack.credits, pack.generationCost)} versions
                    </small>
                    <b>{formatDemoPackPrice(pack.priceValue, demo.choices.currency)}</b>
                  </span>
                </button>
              );
            })}
          </div>

          {!demo.isDemo && demo.pack ? (
            <div className="creation-pack-coupon" aria-label="Code promo">
              <p>{t("Un code promo ?")}</p>
              {demo.coupon ? (
                <div className="creation-pack-coupon-applied">
                  <span>
                    <Icon i="ticket-percent" size={16} />
                    {demo.coupon.code} — {t("réduction appliquée")}
                  </span>
                  <button type="button" onClick={clearCoupon} aria-label={t("Retirer le code promo")}>
                    <Icon i="x" size={15} />
                  </button>
                </div>
              ) : (
                <div className="creation-pack-coupon-form">
                  <input
                    value={couponInput}
                    onChange={(event) => setCouponInput(event.target.value.toUpperCase())}
                    placeholder={t("Code promo")}
                    maxLength={32}
                    aria-label={t("Code promo")}
                  />
                  <button type="button" onClick={applyCoupon} disabled={!couponInput.trim() || couponPending}>
                    {couponPending ? t("Vérification…") : t("Appliquer")}
                  </button>
                </div>
              )}
              {couponError ? (
                <p role="alert" className="creation-pack-coupon-error">
                  {couponError}
                </p>
              ) : null}
            </div>
          ) : null}

          <div className="creation-pack-payment-methods" aria-label="Moyens de paiement acceptés">
            <p>{t("Moyens de paiement acceptés")}</p>
            <div className="pack-payment-logos">
              <span className="payment-logo payment-logo-orange-money">
                <Image src="/banani/payment-logos/orange-money.png" alt="Orange Money" width={132} height={36} />
              </span>
              <span className="payment-logo payment-logo-mtn-momo">
                <Image src="/banani/payment-logos/mtn-momo.png" alt="MTN MoMo" width={96} height={45} />
              </span>
              <span className="payment-logo payment-logo-moov-money">
                <Image src="/banani/payment-logos/moov-money.png" alt="Moov Money" width={54} height={54} />
              </span>
              <span className="payment-logo payment-logo-wave-money">
                <Image src="/banani/payment-logos/wave.png" alt="Wave" width={96} height={42} />
              </span>
              <span className="payment-logo payment-logo-card">
                <Image src="/banani/payment-logos/visa.svg" alt="Visa" width={44} height={15} />
                <Image src="/banani/payment-logos/mastercard.svg" alt="Mastercard" width={31} height={24} />
              </span>
            </div>
          </div>
        </section>
      </div>

      <div className="creation-mobile-cta creation-pack-cta">
        <div className="creation-pack-total">
          <span>{demo.pack?.name ?? t("Aucune offre sélectionnée")}</span>
          {demo.pack && demo.coupon ? (
            <span className="creation-pack-total-discounted">
              <s>{formatDemoPackPrice(demo.pack.priceValue, demo.choices.currency)}</s>
              <strong>{formatDemoPackPrice(demo.coupon.finalAmount, demo.choices.currency)}</strong>
            </span>
          ) : (
            <strong>{demo.pack ? formatDemoPackPrice(demo.pack.priceValue, demo.choices.currency) : "—"}</strong>
          )}
        </div>
        <button
          type="button"
          data-demo-ready="true"
          disabled={!demo.pack}
          onClick={() => demo.pack && demo.go("/dashboard/payment-preview/chariow")}
        >
          {t("Aller au paiement")}
          <Icon i="arrow-right" size={19} />
        </button>
      </div>
    </div>
  );
}
