"use client";

import { goToAuthenticatedSpace } from "@/lib/auth/go-to-authenticated-space";
import { FormEvent, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { authClient } from "@/lib/auth/client";
import { apiFetch } from "@/lib/api/client";
import { ownerTwoFactorContextSchema, twoFactorBackupCodeSchema, twoFactorCodeSchema } from "@/lib/validation/auth";
import Icon from "@/components/banani/Icon";
import { AuthBackLink, AuthHeroIcon } from "@/components/auth/auth-ui";
import { Skeleton } from "@/components/ui/skeleton";
import { translate as t, translateTemplate } from "@/lib/i18n/translate";
import { useI18nOverlay } from "@/lib/i18n/use-overlay";
import { translateIssue } from "@/lib/validation/translate-issue";
import { authResultErrorMessage } from "@/lib/auth/auth-error-messages";

type Method = "otp" | "totp" | "backup";
type Context = { email: string; expiresAt: string; methods: Method[] };

function timerLabel(seconds: number) {
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`;
}

export function TwoFactorChallenge() {
  useI18nOverlay();
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const autoSent = useRef(false);
  const [context, setContext] = useState<Context | null>(null);
  const [method, setMethod] = useState<Method>("otp");
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);
  const [secondsLeft, setSecondsLeft] = useState(0);

  useEffect(() => {
    let active = true;
    apiFetch<unknown>("/api/auth/two-factor/owner-context", { retries: 0 })
      .then((raw) => {
        const parsed = ownerTwoFactorContextSchema.safeParse(raw);
        if (!parsed.success) throw new Error("invalid-owner-context");
        if (!active) return;
        const data = parsed.data;
        setContext(data);
        // L'application d'authentification passe en premier ; l'e-mail et les codes de secours viennent ensuite.
        setMethod(data.methods[0]);
        // Sans application enregistrée, le code e-mail est la seule méthode : on l'envoie tout de suite.
        if (data.methods[0] === "otp" && !autoSent.current) {
          autoSent.current = true;
          void resend();
        }
        setSecondsLeft(Math.max(0, Math.ceil((new Date(data.expiresAt).getTime() - Date.now()) / 1000)));
        requestAnimationFrame(() => inputRef.current?.focus());
      })
      .catch(() => {
        if (active) setError(t("Cette vérification est expirée ou n’est pas autorisée."));
      });
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (!context) return;
    const timer = window.setInterval(() => setSecondsLeft((value) => Math.max(0, value - 1)), 1000);
    return () => window.clearInterval(timer);
  }, [context]);

  // Garde synchrone : évite une double vérification (saisie automatique + clic) avant que `busy` ne soit rendu.
  const verifying = useRef(false);

  // Codes à 6 chiffres (application / e-mail) : la vérification part dès que le dernier chiffre est saisi.
  // Le code de secours reste validé à la main (longueur variable).
  useEffect(() => {
    if (method !== "backup" && code.length === 6 && !busy && !(method === "otp" && secondsLeft <= 0)) {
      void verify();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- seule la saisie du code déclenche l'envoi
  }, [code]);

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void verify();
  }

  async function verify() {
    if (verifying.current) return;
    setError("");
    setNotice("");
    const parsed = (method === "backup" ? twoFactorBackupCodeSchema : twoFactorCodeSchema).safeParse({ code });
    if (!parsed.success) {
      const issue = parsed.error.issues[0];
      setError(issue ? translateIssue(issue) : t("Saisissez les 6 chiffres du code."));
      return;
    }
    if (method === "otp" && secondsLeft <= 0) {
      setError(t("Ce code a expiré. Demandez un nouveau code."));
      return;
    }
    verifying.current = true;
    setBusy(true);
    const result =
      method === "otp"
        ? await authClient.twoFactor.verifyOtp({ code: parsed.data.code, trustDevice: false })
        : method === "backup"
          ? await authClient.twoFactor.verifyBackupCode({ code: parsed.data.code, trustDevice: false })
          : await authClient.twoFactor.verifyTotp({ code: parsed.data.code, trustDevice: false });
    if (result.error) {
      setError(authResultErrorMessage(result.error, t("Code invalide. Vérifiez les chiffres et réessayez.")));
      verifying.current = false;
      setBusy(false);
      // Code à 6 chiffres refusé : on le vide pour pouvoir en saisir un autre (et relancer la vérification automatique).
      if (method !== "backup") {
        setCode("");
        requestAnimationFrame(() => inputRef.current?.focus());
      }
      return;
    }
    goToAuthenticatedSpace();
  }

  async function resend() {
    setBusy(true);
    setError("");
    setNotice("");
    const result = await authClient.twoFactor.sendOtp({ trustDevice: false });
    if (result.error) {
      setError(authResultErrorMessage(result.error, t("Impossible d’envoyer un nouveau code.")));
    } else {
      setSecondsLeft(300);
      setCode("");
      setNotice(t("Un nouveau code vient d’être envoyé."));
      inputRef.current?.focus();
    }
    setBusy(false);
  }

  function selectMethod(next: Method) {
    setMethod(next);
    setCode("");
    setError("");
    setNotice("");
    requestAnimationFrame(() => inputRef.current?.focus());
  }

  return (
    <div className="auth-page auth-page-surface owner-2fa-page">
      <nav className="auth-topbar">
        <AuthBackLink label={t("Retour")} />
      </nav>
      <main className="auth-flow auth-flow-2fa">
        <AuthHeroIcon icon="shield-check" />
        <p className="owner-2fa-eyebrow">{t("Accès propriétaire sécurisé")}</p>
        <h1>{t("Vérification en deux étapes")}</h1>
        {!context && !error ? (
          <div className="owner-2fa-loading" aria-label={t("Chargement de la vérification")} aria-busy="true">
            <Skeleton className="owner-2fa-skeleton-copy" />
            <Skeleton className="owner-2fa-skeleton-card" />
          </div>
        ) : context ? (
          <>
            <p className="auth-flow-copy">
              {method === "otp" ? (
                <>
                  {t("Nous avons envoyé un code à")} <strong>{context.email}</strong>.
                </>
              ) : method === "backup" ? (
                <>{t("Saisissez l’un de vos codes de secours. Chaque code ne sert qu’une seule fois.")}</>
              ) : (
                <>
                  {t("Ouvrez votre application d’authentification pour obtenir votre code.")}{" "}
                  {t("Téléphone perdu ? Recevez un code par e-mail ci-dessous.")}
                </>
              )}
            </p>
            <form className="auth-code-card" onSubmit={submit}>
              <label htmlFor="owner-2fa-code">
                {method === "backup" ? t("Entrez un code de secours") : t("Entrez le code à 6 chiffres")}
              </label>
              {method === "backup" ? (
                <input
                  ref={inputRef}
                  id="owner-2fa-code"
                  className="owner-2fa-backup-input"
                  name="code"
                  type="text"
                  autoComplete="off"
                  autoCapitalize="none"
                  spellCheck={false}
                  maxLength={24}
                  placeholder="xxxxx-xxxxx"
                  value={code}
                  onChange={(event) => setCode(event.target.value.replace(/[^A-Za-z0-9-]/g, "").slice(0, 24))}
                  aria-label={t("Code de secours")}
                  required
                />
              ) : (
                <div className="auth-code-boxes">
                  {Array.from({ length: 6 }, (_, index) => (
                    <span
                      className={index < code.length ? "filled" : index === code.length ? "active" : ""}
                      key={index}
                    >
                      {code[index] || ""}
                    </span>
                  ))}
                  <input
                    ref={inputRef}
                    id="owner-2fa-code"
                    name="code"
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    value={code}
                    onChange={(event) => setCode(event.target.value.replace(/\D/g, "").slice(0, 6))}
                    aria-label={t("Code d’authentification à six chiffres")}
                    required
                  />
                </div>
              )}
              {method === "otp" && (
                <p className={secondsLeft === 0 ? "owner-2fa-timer is-expired" : "owner-2fa-timer"}>
                  <Icon i="clock-3" size={15} />
                  {secondsLeft > 0
                    ? translateTemplate("Ce code expire dans {time}", { time: timerLabel(secondsLeft) })
                    : t("Ce code a expiré")}
                </p>
              )}
              {error && (
                <p className="auth-alert auth-alert-error" role="alert">
                  {error}
                </p>
              )}
              {notice && (
                <p className="auth-alert auth-alert-success" role="status">
                  {notice}
                </p>
              )}
              <button
                className="auth-submit"
                disabled={
                  busy || code.length < (method === "backup" ? 8 : 6) || (method === "otp" && secondsLeft === 0)
                }
              >
                <Icon i="shield-check" size={18} />
                {busy ? t("Vérification…") : t("Vérifier le code")}
              </button>
              {method === "otp" && (
                <button className="owner-2fa-resend" type="button" onClick={resend} disabled={busy}>
                  <Icon i="refresh-cw" size={15} /> {t("Renvoyer le code")}
                </button>
              )}
            </form>
            <div className="auth-methods">
              <p>{t("Autre méthode de vérification")}</p>
              {context.methods.includes("otp") && method !== "otp" && (
                <button
                  type="button"
                  onClick={() => {
                    selectMethod("otp");
                    void resend();
                  }}
                >
                  <span>
                    <Icon i="mail" size={16} />
                  </span>
                  {t("Recevoir un code par e-mail")}
                  <Icon i="chevron-right" size={16} />
                </button>
              )}
              {context.methods.includes("backup") && method !== "backup" && (
                <button type="button" onClick={() => selectMethod("backup")}>
                  <span>
                    <Icon i="key-round" size={16} />
                  </span>
                  {t("Utiliser un code de secours")}
                  <Icon i="chevron-right" size={16} />
                </button>
              )}
              {context.methods.includes("totp") && method !== "totp" && (
                <button type="button" onClick={() => selectMethod("totp")}>
                  <span>
                    <Icon i="smartphone" size={16} />
                  </span>
                  Google Authenticator
                  <Icon i="chevron-right" size={16} />
                </button>
              )}
            </div>
            <p className="owner-2fa-security-note">
              <Icon i="lock-keyhole" size={14} /> {t("Vérification réservée aux propriétaires MusikPro")}
            </p>
          </>
        ) : (
          <div className="auth-code-card owner-2fa-invalid">
            <p className="auth-alert auth-alert-error" role="alert">
              {error}
            </p>
            <button className="auth-submit" type="button" onClick={() => router.replace("/login")}>
              {t("Retour à la connexion")}
            </button>
          </div>
        )}
      </main>
    </div>
  );
}
