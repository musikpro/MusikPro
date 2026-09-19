"use client";

import { FormEvent, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { authClient } from "@/lib/auth/client";
import { apiFetch } from "@/lib/api/client";
import { ownerTwoFactorContextSchema, twoFactorCodeSchema } from "@/lib/validation/auth";
import Icon from "@/components/banani/Icon";
import { AuthBackLink, AuthHeroIcon } from "@/components/auth/auth-ui";
import { Skeleton } from "@/components/ui/skeleton";

type Method = "otp" | "totp";
type Context = { email: string; expiresAt: string; methods: Method[] };

function timerLabel(seconds: number) {
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`;
}

export function TwoFactorChallenge() {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
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
        if (!parsed.success) throw new Error("Réponse de vérification invalide");
        if (!active) return;
        const data = parsed.data;
        setContext(data);
        const stored = sessionStorage.getItem("owner-2fa-method");
        setMethod(stored === "totp" && data.methods.includes("totp") ? "totp" : data.methods[0]);
        setSecondsLeft(Math.max(0, Math.ceil((new Date(data.expiresAt).getTime() - Date.now()) / 1000)));
        requestAnimationFrame(() => inputRef.current?.focus());
      })
      .catch(() => {
        if (active) setError("Cette vérification est expirée ou n’est pas autorisée.");
      });
    return () => { active = false; };
  }, []);

  useEffect(() => {
    if (!context) return;
    const timer = window.setInterval(() => setSecondsLeft((value) => Math.max(0, value - 1)), 1000);
    return () => window.clearInterval(timer);
  }, [context]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setNotice("");
    const parsed = twoFactorCodeSchema.safeParse({ code });
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message || "Saisissez les 6 chiffres du code.");
      return;
    }
    if (secondsLeft <= 0) {
      setError("Ce code a expiré. Demandez un nouveau code.");
      return;
    }
    setBusy(true);
    const result = method === "otp"
      ? await authClient.twoFactor.verifyOtp({ code: parsed.data.code, trustDevice: false })
      : await authClient.twoFactor.verifyTotp({ code: parsed.data.code, trustDevice: false });
    if (result.error) {
      setError(result.error.message || "Code invalide. Vérifiez les chiffres et réessayez.");
      setBusy(false);
      return;
    }
    sessionStorage.removeItem("owner-2fa-method");
    router.push("/auth/continue");
    router.refresh();
  }

  async function resend() {
    setBusy(true);
    setError("");
    setNotice("");
    const result = await authClient.twoFactor.sendOtp({ trustDevice: false });
    if (result.error) {
      setError(result.error.message || "Impossible d’envoyer un nouveau code.");
    } else {
      setSecondsLeft(300);
      setCode("");
      setNotice("Un nouveau code vient d’être envoyé.");
      inputRef.current?.focus();
    }
    setBusy(false);
  }

  function selectMethod(next: Method) {
    setMethod(next);
    setCode("");
    setError("");
    setNotice("");
    sessionStorage.setItem("owner-2fa-method", next);
    requestAnimationFrame(() => inputRef.current?.focus());
  }

  return (
    <div className="auth-page auth-page-surface owner-2fa-page">
      <nav className="auth-topbar"><AuthBackLink label="Retour" /></nav>
      <main className="auth-flow auth-flow-2fa">
        <AuthHeroIcon icon="shield-check" />
        <p className="owner-2fa-eyebrow">Accès propriétaire sécurisé</p>
        <h1>Vérification en deux étapes</h1>
        {!context && !error ? (
          <div className="owner-2fa-loading" aria-label="Chargement de la vérification" aria-busy="true">
            <Skeleton className="owner-2fa-skeleton-copy" />
            <Skeleton className="owner-2fa-skeleton-card" />
          </div>
        ) : context ? (
          <>
            <p className="auth-flow-copy">
              {method === "otp"
                ? <>Nous avons envoyé un code à <strong>{context.email}</strong>.</>
                : <>Ouvrez votre application d’authentification pour obtenir votre code.</>}
            </p>
            <form className="auth-code-card" onSubmit={submit}>
              <label htmlFor="owner-2fa-code">Entrez le code à 6 chiffres</label>
              <div className="auth-code-boxes" onClick={() => inputRef.current?.focus()}>
                {Array.from({ length: 6 }, (_, index) => (
                  <span className={index < code.length ? "filled" : index === code.length ? "active" : ""} key={index}>
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
                  aria-label="Code d’authentification à six chiffres"
                  required
                />
              </div>
              <p className={secondsLeft === 0 ? "owner-2fa-timer is-expired" : "owner-2fa-timer"}>
                <Icon i="clock-3" size={15} />
                {secondsLeft > 0 ? `Ce code expire dans ${timerLabel(secondsLeft)}` : "Ce code a expiré"}
              </p>
              {error && <p className="auth-alert auth-alert-error" role="alert">{error}</p>}
              {notice && <p className="auth-alert auth-alert-success" role="status">{notice}</p>}
              <button className="auth-submit" disabled={busy || code.length !== 6 || secondsLeft === 0}>
                <Icon i="shield-check" size={18} />
                {busy ? "Vérification…" : "Vérifier le code"}
              </button>
              {method === "otp" && (
                <button className="owner-2fa-resend" type="button" onClick={resend} disabled={busy}>
                  <Icon i="refresh-cw" size={15} /> Renvoyer le code
                </button>
              )}
            </form>
            <div className="auth-methods">
              <p>Autre méthode de vérification</p>
              {context.methods.includes("otp") && method !== "otp" && (
                <button type="button" onClick={() => { selectMethod("otp"); void resend(); }}>
                  <span><Icon i="mail" size={16} /></span>
                  Recevoir un code par e-mail
                  <Icon i="chevron-right" size={16} />
                </button>
              )}
              {context.methods.includes("totp") && method !== "totp" && (
                <button type="button" onClick={() => selectMethod("totp")}>
                  <span><Icon i="smartphone" size={16} /></span>
                  Google Authenticator
                  <Icon i="chevron-right" size={16} />
                </button>
              )}
            </div>
            <p className="owner-2fa-security-note"><Icon i="lock-keyhole" size={14} /> Vérification réservée aux propriétaires MusikPro</p>
          </>
        ) : (
          <div className="auth-code-card owner-2fa-invalid">
            <p className="auth-alert auth-alert-error" role="alert">{error}</p>
            <button className="auth-submit" type="button" onClick={() => router.replace("/login")}>Retour à la connexion</button>
          </div>
        )}
      </main>
    </div>
  );
}
