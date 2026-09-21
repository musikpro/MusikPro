"use client";

import { useEffect, useState } from "react";
import Icon from "@/components/banani/Icon";

export default function AdminToast({
  message,
  tone = "success",
}: {
  message: string;
  tone?: "success" | "error" | "info";
}) {
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const timer = window.setTimeout(() => setVisible(false), 6500);
    return () => window.clearTimeout(timer);
  }, [message]);

  if (!visible) return null;
  return (
    <div
      className={`admin-toast is-${tone}`}
      role={tone === "error" ? "alert" : "status"}
      aria-live={tone === "error" ? "assertive" : "polite"}
    >
      <span className="admin-toast-icon">
        <Icon i={tone === "success" ? "circle-check" : tone === "error" ? "circle-alert" : "info"} size={20} />
      </span>
      <div>
        <strong>
          {tone === "success" ? "Connexion réussie" : tone === "error" ? "Connexion impossible" : "Information"}
        </strong>
        <p>{message}</p>
      </div>
      <button type="button" onClick={() => setVisible(false)} aria-label="Fermer la notification">
        <Icon i="x" size={16} />
      </button>
    </div>
  );
}
