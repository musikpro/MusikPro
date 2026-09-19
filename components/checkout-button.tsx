"use client";
import { useState } from "react";
import { InlineNotice } from "@/components/ui/inline-notice";

export function CheckoutButton({ planId }: { planId: string }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  async function pay() {
    setBusy(true);
    setError("");
    const origin = window.location.origin;
    const r = await fetch("/api/payments/checkout", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        planId,
        successUrl: `${origin}/dashboard/billing?payment=return`,
        cancelUrl: `${origin}/dashboard/billing?payment=cancelled`,
      }),
    });
    const data = await r.json();
    if (!r.ok || !data.checkoutUrl) {
      setError(data.error || "Paiement indisponible");
      setBusy(false);
      return;
    }
    window.location.assign(data.checkoutUrl);
  }
  return (
    <>
      <button className="btn" onClick={pay} disabled={busy}>
        {busy ? "Ouverture…" : "Continuer vers le paiement"}
      </button>
      {error && <InlineNotice tone="error">{error}</InlineNotice>}
    </>
  );
}
