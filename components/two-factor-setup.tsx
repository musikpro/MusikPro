"use client";
import { goToAuthenticatedSpace } from "@/lib/auth/go-to-authenticated-space";
import { FormEvent, useState } from "react";
import { authClient } from "@/lib/auth/client";
import { backupCodesFileContent, totpSetupKey } from "@/lib/auth/backup-codes-file";
import { twoFactorCodeSchema, twoFactorOptionalPasswordSchema } from "@/lib/validation/auth";
import { translate as t } from "@/lib/i18n/translate";
import { useI18nOverlay } from "@/lib/i18n/use-overlay";
import { translateIssue } from "@/lib/validation/translate-issue";
import { authResultErrorMessage } from "@/lib/auth/auth-error-messages";

function BackupCodes({ codes }: { codes: string[] }) {
  const [copied, setCopied] = useState(false);
  async function copy() {
    try {
      await navigator.clipboard.writeText(codes.join("\n"));
      setCopied(true);
    } catch {
      setCopied(false);
    }
  }
  function download() {
    const blob = new Blob([backupCodesFileContent(codes, "MusikPro")], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "musikpro-codes-de-secours.txt";
    link.click();
    URL.revokeObjectURL(url);
  }
  return (
    <div className="notice">
      <strong>{t("Codes de secours — à conserver hors ligne")}</strong>
      <p>{t("Chaque code ne sert qu’une seule fois si vous perdez l’accès à votre application d’authentification.")}</p>
      <ul className="twofa-codes">
        {codes.map((code) => (
          <li key={code}>{code}</li>
        ))}
      </ul>
      <div className="twofa-actions">
        <button type="button" className="btn" onClick={copy}>
          {copied ? t("Codes copiés") : t("Copier les codes")}
        </button>
        <button type="button" className="btn" onClick={download}>
          {t("Télécharger (.txt)")}
        </button>
      </div>
    </div>
  );
}

export function TwoFactorSetup({ enabled, totpConfigured }: { enabled: boolean; totpConfigured: boolean }) {
  useI18nOverlay();
  const [uri, setUri] = useState("");
  const [codes, setCodes] = useState<string[]>([]);
  const [saved, setSaved] = useState(false);
  const [message, setMessage] = useState("");
  const [newCodes, setNewCodes] = useState<string[]>([]);
  const setupKey = uri ? totpSetupKey(uri) : null;

  async function enable(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setMessage("");
    const parsed = twoFactorOptionalPasswordSchema.safeParse({
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
      setMessage(authResultErrorMessage(r.error, t("Impossible d’activer le 2FA")));
      return;
    }
    const d = r.data;
    if (!d || d.method !== "totp") {
      setMessage(t("Configuration TOTP indisponible."));
      return;
    }
    setUri(d.totpURI);
    setCodes(d.backupCodes);
    setSaved(false);
    setMessage(
      t(
        "Ajoutez la clé dans votre application d’authentification, conservez vos codes de secours, puis validez le code.",
      ),
    );
  }

  async function verify(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!saved) {
      setMessage(t("Confirmez d’abord que vous avez conservé vos codes de secours."));
      return;
    }
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
      setMessage(authResultErrorMessage(r.error, t("Code invalide")));
      return;
    }
    setMessage(t("2FA activé. Redirection vers votre espace…"));
    setUri("");
    goToAuthenticatedSpace();
  }

  async function regenerate(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setMessage("");
    const parsed = twoFactorOptionalPasswordSchema.safeParse({
      password: String(new FormData(e.currentTarget).get("password") || ""),
    });
    if (!parsed.success) {
      const issue = parsed.error.issues[0];
      setMessage(issue ? translateIssue(issue) : t("Mot de passe invalide"));
      return;
    }
    const r = await authClient.twoFactor.generateBackupCodes({ password: parsed.data.password });
    if (r.error || !r.data) {
      setMessage(authResultErrorMessage(r.error ?? { message: "" }, t("Impossible de générer de nouveaux codes.")));
      return;
    }
    setNewCodes(r.data.backupCodes);
    setMessage(t("Nouveaux codes générés : les anciens ne fonctionnent plus."));
    e.currentTarget.reset();
  }

  if (enabled && totpConfigured)
    return (
      <div className="card security-2fa-card is-enabled">
        <h2>{t("Authentification à deux facteurs")}</h2>
        <p className="success">{t("2FA activé sur votre compte.")}</p>
        <h3>{t("Codes de secours")}</h3>
        <p className="muted">
          {t(
            "Perdu vos codes ? Générez-en de nouveaux (les anciens seront invalidés). Votre mot de passe est demandé.",
          )}
        </p>
        <form onSubmit={regenerate} className="security-2fa-form">
          <label className="field">
            {t("Mot de passe actuel (laissez vide si vous vous connectez avec Google)")}
            <input type="password" name="password" autoComplete="current-password" />
          </label>
          <button className="btn security-primary-button">{t("Générer de nouveaux codes")}</button>
        </form>
        {newCodes.length > 0 && <BackupCodes codes={newCodes} />}
        {message && <p role="status">{message}</p>}
      </div>
    );

  return (
    <div className="card security-2fa-card">
      <h2>{t("Activer le 2FA (application d’authentification)")}</h2>
      {enabled && (
        <p className="muted">
          {t(
            "La vérification par e-mail est active. Ajoutez une application d’authentification et vos codes de secours.",
          )}
        </p>
      )}
      {!uri && (
        <form onSubmit={enable} className="security-2fa-form">
          <label className="field">
            {t("Mot de passe actuel (laissez vide si vous vous connectez avec Google)")}
            <input type="password" name="password" autoComplete="current-password" />
          </label>
          <button className="btn security-primary-button">{t("Commencer l’activation")}</button>
        </form>
      )}
      {uri && (
        <>
          <h3>{t("1. Ajoutez MusikPro dans votre application")}</h3>
          <p className="muted">
            {t("Dans Google Authenticator (ou équivalent) : Ajouter un compte, puis Saisir une clé de configuration.")}
          </p>
          {setupKey ? <code className="twofa-key">{setupKey}</code> : null}
          <div className="twofa-actions">
            <a className="btn" href={uri}>
              {t("Ouvrir dans l’application")}
            </a>
            {setupKey && (
              <button
                type="button"
                className="btn"
                onClick={() => void navigator.clipboard?.writeText(setupKey.replace(/\s/g, ""))}
              >
                {t("Copier la clé")}
              </button>
            )}
          </div>
          <h3>{t("2. Conservez vos codes de secours")}</h3>
          {codes.length > 0 && <BackupCodes codes={codes} />}
          <label className="twofa-confirm">
            <input type="checkbox" checked={saved} onChange={(event) => setSaved(event.target.checked)} />
            {t("J’ai conservé mes codes de secours dans un endroit sûr.")}
          </label>
          <h3>{t("3. Validez avec le code de l’application")}</h3>
          <form onSubmit={verify} className="security-2fa-form">
            <label className="field">
              {t("Code à 6 chiffres")}
              <input name="code" inputMode="numeric" pattern="[0-9]{6}" autoComplete="one-time-code" required />
            </label>
            <button className="btn security-primary-button" disabled={!saved}>
              {t("Valider le 2FA")}
            </button>
          </form>
        </>
      )}
      {message && <p role="status">{message}</p>}
    </div>
  );
}
