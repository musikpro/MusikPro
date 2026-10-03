"use client";
import { goToAuthenticatedSpace } from "@/lib/auth/go-to-authenticated-space";
import { FormEvent, useState } from "react";
import { authClient } from "@/lib/auth/client";
import { twoFactorCodeSchema, twoFactorEnableSchema } from "@/lib/validation/auth";
import { translate as t } from "@/lib/i18n/translate";
import { useI18nOverlay } from "@/lib/i18n/use-overlay";
import { translateIssue } from "@/lib/validation/translate-issue";
import { authErrorMessage } from "@/lib/auth/auth-error-messages";

export function TwoFactorSetup({ enabled }: { enabled: boolean }) {
  useI18nOverlay();
  const [uri, setUri] = useState("");
  const [codes, setCodes] = useState<string[]>([]);
  const [message, setMessage] = useState("");
  async function enable(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setMessage("");
    const parsed = twoFactorEnableSchema.safeParse({
      password: String(new FormData(e.currentTarget).get("password") || ""),
    });
    if (!parsed.success) {
      const issue = parsed.error.issues[0];
      setMessage(issue ? translateIssue(issue) : t("Mot de passe invalide"));
      return;
    }
    const r = await authClient.twoFactor.enable({
      password: parsed.data.password,
      method: "totp",
    });
    if (r.error) {
      setMessage(authErrorMessage(r.error.code, t("Impossible d’activer le 2FA")));
      return;
    }
    const d = r.data;
    if (!d || d.method !== "totp") {
      setMessage(t("Configuration TOTP indisponible."));
      return;
    }
    setUri(d.totpURI);
    setCodes(d.backupCodes);
    setMessage(t("Scannez/ajoutez le secret dans votre application d’authentification, puis validez le code."));
  }
  async function verify(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const parsed = twoFactorCodeSchema.safeParse({
      code: String(new FormData(e.currentTarget).get("code") || ""),
    });
    if (!parsed.success) {
      const issue = parsed.error.issues[0];
      setMessage(issue ? translateIssue(issue) : t("Code invalide"));
      return;
    }
    const r = await authClient.twoFactor.verifyTotp({
      code: parsed.data.code,
      trustDevice: false,
    });
    if (r.error) {
      setMessage(authErrorMessage(r.error.code, t("Code invalide")));
      return;
    }
    setMessage(t("2FA activé. Redirection vers votre espace…"));
    setUri("");
    goToAuthenticatedSpace();
  }
  if (enabled)
    return (
      <div className="card security-2fa-card is-enabled">
        <h2>{t("Authentification à deux facteurs")}</h2>
        <p className="success">{t("2FA activé sur votre compte.")}</p>
      </div>
    );
  return (
    <div className="card security-2fa-card">
      <h2>{t("Activer le 2FA (TOTP)")}</h2>
      <form onSubmit={enable} className="security-2fa-form">
        <label className="field">
          {t("Mot de passe actuel")}
          <input type="password" name="password" required />
        </label>
        <button className="btn security-primary-button">{t("Commencer l’activation")}</button>
      </form>
      {uri && (
        <>
          <p className="muted">{t("URI TOTP (à ouvrir/importer dans votre application d’authentification) :")}</p>
          <code style={{ wordBreak: "break-all" }}>{uri}</code>
          {codes.length > 0 && (
            <div className="notice">
              <strong>{t("Codes de secours — conservez-les hors ligne :")}</strong>
              <p>{codes.join(" · ")}</p>
            </div>
          )}
          <form onSubmit={verify} className="security-2fa-form">
            <label className="field">
              {t("Code à 6 chiffres")}
              <input name="code" inputMode="numeric" pattern="[0-9]{6}" required />
            </label>
            <button className="btn security-primary-button">{t("Valider le 2FA")}</button>
          </form>
        </>
      )}
      {message && <p>{message}</p>}
    </div>
  );
}
