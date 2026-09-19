"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { authClient } from "@/lib/auth/client";
import { resetPasswordSchema } from "@/lib/validation/auth";
import Icon from "@/components/banani/Icon";
import { AuthHeroIcon, AuthLogo } from "@/components/auth/auth-ui";

export function ResetPasswordForm() {
  const params = useSearchParams();
  const router = useRouter();
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [busy, setBusy] = useState(false);
  const [passwordVisible, setPasswordVisible] = useState(false);
  const token = params.get("token");
  const invalid = params.get("error");

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!token) return;
    setError("");
    setSuccess("");
    const parsed = resetPasswordSchema.safeParse({
      password: String(new FormData(event.currentTarget).get("password") || ""),
      token,
    });
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message || "Données invalides");
      return;
    }
    setBusy(true);
    const result = await authClient.resetPassword({ newPassword: parsed.data.password, token: parsed.data.token });
    if (result.error) {
      setError(result.error.message || "Lien invalide ou expiré");
      setBusy(false);
      return;
    }
    setSuccess("Votre mot de passe a été modifié. Redirection vers la connexion…");
    setTimeout(() => router.push("/login"), 900);
  }

  return (
    <div className="auth-page">
      <div className="auth-panel">
        <div className="auth-logo-wrap">
          <AuthLogo />
        </div>
        <div className="auth-form auth-reset-form">
          <AuthHeroIcon icon={invalid || !token ? "link-2-off" : "key-round"} />
          {invalid || !token ? (
            <>
              <h1>Lien invalide</h1>
              <p className="auth-subtitle">Ce lien de réinitialisation est invalide ou a expiré.</p>
              <p className="auth-alert auth-alert-error" role="alert">
                Demandez un nouveau lien pour protéger votre compte.
              </p>
              <Link className="auth-submit" href="/forgot-password">
                Recevoir un nouveau lien
              </Link>
              <p className="auth-switch">
                <Link href="/login">Retour à la connexion</Link>
              </p>
            </>
          ) : (
            <form onSubmit={submit} noValidate>
              <h1>Nouveau mot de passe</h1>
              <p className="auth-subtitle">Choisissez un nouveau mot de passe sécurisé pour votre compte.</p>
              <label className="auth-field">
                <span>Mot de passe</span>
                <span className="auth-input">
                  <Icon i="lock" size={17} />
                  <input
                    name="password"
                    type={passwordVisible ? "text" : "password"}
                    autoComplete="new-password"
                    placeholder="Votre nouveau mot de passe"
                    minLength={10}
                    autoFocus
                    required
                  />
                  <button
                    type="button"
                    className="auth-eye"
                    onClick={() => setPasswordVisible((value) => !value)}
                    aria-label={passwordVisible ? "Masquer le mot de passe" : "Afficher le mot de passe"}
                  >
                    <Icon i={passwordVisible ? "eye-off" : "eye"} size={18} />
                  </button>
                </span>
                <small>Minimum 10 caractères</small>
              </label>
              {error && (
                <p className="auth-alert auth-alert-error" role="alert">
                  {error}
                </p>
              )}
              {success && (
                <p className="auth-alert auth-alert-success" role="status">
                  {success}
                </p>
              )}
              <button className="auth-submit" disabled={busy}>
                {busy ? "Modification…" : "Modifier le mot de passe"}
              </button>
              <p className="auth-switch">
                <Link href="/login">Retour à la connexion</Link>
              </p>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
