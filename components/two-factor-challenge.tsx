"use client";

import { FormEvent, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { authClient } from "@/lib/auth/client";
import { twoFactorCodeSchema } from "@/lib/validation/auth";
import Icon from "@/components/banani/Icon";
import { AuthBackLink, AuthHeroIcon } from "@/components/auth/auth-ui";

export function TwoFactorChallenge() {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    const parsed = twoFactorCodeSchema.safeParse({ code });
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message || "Code invalide");
      return;
    }
    setBusy(true);
    const result = await authClient.twoFactor.verifyTotp({ code: parsed.data.code, trustDevice: true });
    if (result.error) {
      setError(result.error.message || "Code invalide");
      setBusy(false);
      return;
    }
    router.push("/dashboard");
    router.refresh();
  }

  return (
    <div className="auth-page auth-page-surface">
      <nav className="auth-topbar">
        <AuthBackLink label="Retour" />
      </nav>
      <main className="auth-flow auth-flow-2fa">
        <AuthHeroIcon icon="shield-check" />
        <h1>Vérification en deux étapes</h1>
        <p className="auth-flow-copy">Saisissez le code généré par votre application d’authentification.</p>
        <form className="auth-code-card" onSubmit={submit}>
          <label htmlFor="totp-code">Entrez le code à 6 chiffres</label>
          <div className="auth-code-boxes" onClick={() => inputRef.current?.focus()}>
            {Array.from({ length: 6 }, (_, index) => (
              <span className={index < code.length ? "filled" : index === code.length ? "active" : ""} key={index}>
                {code[index] || ""}
              </span>
            ))}
            <input
              ref={inputRef}
              id="totp-code"
              name="code"
              inputMode="numeric"
              autoComplete="one-time-code"
              value={code}
              onChange={(event) => setCode(event.target.value.replace(/\D/g, "").slice(0, 6))}
              aria-label="Code d’authentification à six chiffres"
              required
            />
          </div>
          <p>Le code est renouvelé automatiquement par votre application.</p>
          {error && (
            <p className="auth-alert auth-alert-error" role="alert">
              {error}
            </p>
          )}
          <button className="auth-submit" disabled={busy}>
            <Icon i="shield-check" size={18} />
            {busy ? "Vérification…" : "Vérifier"}
          </button>
        </form>
        <div className="auth-methods">
          <p>Méthode de vérification</p>
          <button type="button" onClick={() => inputRef.current?.focus()}>
            <span>
              <Icon i="shield" size={15} />
            </span>
            Application d’authentification
            <Icon i="chevron-right" size={16} />
          </button>
        </div>
      </main>
    </div>
  );
}
