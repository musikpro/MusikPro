"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { authClient } from "@/lib/auth/client";
import { TurnstileWidget } from "@/components/turnstile-widget";
import { forgotPasswordSchema } from "@/lib/validation/auth";
import Icon from "@/components/banani/Icon";
import { AuthBackLink, AuthHeroIcon } from "@/components/auth/auth-ui";
import { translate as t } from "@/lib/i18n/translate";
import { useI18nOverlay } from "@/lib/i18n/use-overlay";
import { translateIssue } from "@/lib/validation/translate-issue";

export function ForgotPasswordForm() {
  useI18nOverlay();
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [captchaToken, setCaptchaToken] = useState("");
  const captchaEnabled = Boolean(process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setMessage("");
    if (captchaEnabled && !captchaToken) {
      setError(t("Veuillez terminer la vérification anti-bot."));
      return;
    }
    const parsed = forgotPasswordSchema.safeParse({
      email: String(new FormData(event.currentTarget).get("email") || ""),
    });
    if (!parsed.success) {
      const issue = parsed.error.issues[0];
      setError(issue ? translateIssue(issue) : t("E-mail invalide"));
      return;
    }
    setBusy(true);
    await authClient.requestPasswordReset({
      email: parsed.data.email,
      redirectTo: `${window.location.origin}/reset-password`,
      fetchOptions: captchaToken ? { headers: { "x-captcha-response": captchaToken } } : undefined,
    });
    setBusy(false);
    setMessage(t("Si ce compte existe, un e-mail de réinitialisation a été envoyé."));
  }

  return (
    <div className="auth-page auth-page-surface">
      <nav className="auth-topbar">
        <AuthBackLink />
      </nav>
      <main className="auth-flow">
        <AuthHeroIcon icon="lock-keyhole" />
        <h1>{t("Mot de passe oublié ?")}</h1>
        <p className="auth-flow-copy">
          {t("Entrez votre adresse email. Nous vous enverrons un lien pour réinitialiser votre mot de passe.")}
        </p>
        <form className="auth-flow-form" onSubmit={submit} noValidate>
          <label className="auth-field">
            <span>{t("Adresse email")}</span>
            <span className="auth-input auth-input-white">
              <Icon i="mail" size={17} />
              <input name="email" type="email" autoComplete="email" placeholder={t("votre@email.com")} required />
            </span>
          </label>
          <TurnstileWidget onToken={setCaptchaToken} />
          {error && (
            <p className="auth-alert auth-alert-error" role="alert">
              {error}
            </p>
          )}
          {message && (
            <p className="auth-alert auth-alert-success" role="status">
              {message}
            </p>
          )}
          <button className="auth-submit" disabled={busy}>
            <Icon i="send" size={18} />
            {busy ? t("Envoi…") : t("Envoyer le lien de réinitialisation")}
          </button>
        </form>
        <p className="auth-hint">{t("Vérifiez aussi votre dossier spam si vous ne recevez pas l’email.")}</p>
        <div className="auth-divider">
          <span>{t("OU")}</span>
        </div>
        <div className="auth-methods">
          <p>{t("Besoin d’aide ?")}</p>
          <Link href="mailto:musikpro2026@gmail.com">
            <span>
              <Icon i="headset" size={15} />
            </span>
            {t("Contacter le support")}
            <Icon i="chevron-right" size={16} />
          </Link>
        </div>
      </main>
    </div>
  );
}
