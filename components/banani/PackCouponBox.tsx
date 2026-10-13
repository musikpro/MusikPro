"use client";
import "./credits-gate.css";

import { useState } from "react";
import { apiFetch } from "@/lib/api/client";
import { translateApiMessage } from "@/lib/api/error-messages";
import { translate as t } from "@/lib/i18n/translate";
import Icon from "./Icon";
import { useDemo } from "./DemoProvider";

type CouponApplyResult = {
  valid: boolean;
  reason?: string;
  code?: string;
  discountAmount?: number;
  finalAmount?: number;
};

/**
 * Champ « code promo » de l'achat de crédits (page unique « Crédits & tarifs »). Vérifie le code côté serveur pour l'offre
 * choisie ; la réduction est ensuite appliquée par le paiement (`demo.coupon`). Absent en démonstration.
 */
export default function PackCouponBox() {
  const demo = useDemo();
  const [couponInput, setCouponInput] = useState("");
  const [couponPending, setCouponPending] = useState(false);
  const [couponError, setCouponError] = useState("");

  if (demo.isDemo || !demo.pack) return null;
  const planId = demo.pack.id;

  const applyCoupon = async () => {
    const code = couponInput.trim();
    if (!code) return;
    setCouponPending(true);
    setCouponError("");
    try {
      const result = await apiFetch<CouponApplyResult>("/api/payments/coupons/apply", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code, planId }),
        timeoutMs: 15_000,
      });
      if (!result.valid || result.discountAmount == null) {
        demo.setCoupon(null);
        setCouponError(result.reason ? translateApiMessage(result.reason) : t("Code promo invalide."));
        return;
      }
      demo.setCoupon({
        code: result.code ?? code,
        discountAmount: result.discountAmount,
        finalAmount: result.finalAmount ?? 0,
      });
    } catch {
      setCouponError(t("Impossible de vérifier ce code pour le moment."));
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
    <div className="creation-pack-coupon" aria-label={t("Code promo")}>
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
  );
}
