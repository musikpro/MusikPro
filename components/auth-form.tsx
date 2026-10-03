"use client";
import { goToAuthenticatedSpace } from "@/lib/auth/go-to-authenticated-space";
import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { authClient } from "@/lib/auth/client";
import { canUseNativeGoogleSignIn, NATIVE_GOOGLE_CANCELLED, nativeGoogleIdToken } from "@/lib/auth/native-google";
import { InlineNotice } from "@/components/ui/inline-notice";
import { TurnstileWidget } from "@/components/turnstile-widget";
import { emailSchema, loginSchema, registerIdentitySchema, registerSchema } from "@/lib/validation/auth";
import Icon from "@/components/banani/Icon";
import { AuthLogo, GoogleLogo } from "@/components/auth/auth-ui";
import { translate as t } from "@/lib/i18n/translate";
import { useI18nOverlay } from "@/lib/i18n/use-overlay";
import { translateIssue } from "@/lib/validation/translate-issue";
import { authResultErrorMessage } from "@/lib/auth/auth-error-messages";
import { getOAuthErrorMessage } from "@/lib/auth/oauth-error";

export function AuthForm({
  mode,
  googleEnabled = false,
  googleWebClientId,
  initialErrorCode,
}: {
  mode: "login" | "register";
  googleEnabled?: boolean;
  /** Identifiant client Google « Web » (public) : requis par la connexion Google native de l'application. */
  googleWebClientId?: string;
  /** Code d'erreur OAuth renvoyé par la page serveur (?error=…) : le texte est calculé au rendu, dans la langue courante. */
  initialErrorCode?: string;
}) {
  useI18nOverlay();
  const router = useRouter();
  const [error, setErrorMessage] = useState("");
  const [oauthCode, setOauthCode] = useState(initialErrorCode);
  // Toute action de l'utilisateur qui efface l'erreur efface aussi l'erreur OAuth initiale (comportement d'origine).
  const setError = (message: string) => {
    setErrorMessage(message);
    setOauthCode(undefined);
  };
  const displayedError = error || getOAuthErrorMessage(oauthCode);
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);
  const [captchaToken, setCaptchaToken] = useState("");
  const [passwordVisible, setPasswordVisible] = useState(false);
  // Both modes now collect identity (name for register, email for both) on a first step and the
  // password on a second — mirrors the login flow this file already had, extended to register.
  const [step, setStep] = useState<"identity" | "password">("identity");
  const [identityEmail, setIdentityEmail] = useState("");
  const [identityName, setIdentityName] = useState("");
  const captchaEnabled = Boolean(process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY);
  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    setNotice("");
    const f = new FormData(e.currentTarget);
    const submittedEmail = String(f.get("email") || identityEmail);
    const submittedName = String(f.get("name") || identityName);

    if (step === "identity") {
      if (mode === "register") {
        const parsedIdentity = registerIdentitySchema.safeParse({ name: submittedName, email: submittedEmail });
        if (!parsedIdentity.success) {
          const issue = parsedIdentity.error.issues[0];
          setError(issue ? translateIssue(issue) : t("Données invalides"));
          return;
        }
        setIdentityName(parsedIdentity.data.name);
        setIdentityEmail(parsedIdentity.data.email);
      } else {
        const parsedEmail = emailSchema.safeParse(submittedEmail);
        if (!parsedEmail.success) {
          const issue = parsedEmail.error.issues[0];
          setError(issue ? translateIssue(issue) : t("E-mail invalide"));
          return;
        }
        setIdentityEmail(parsedEmail.data);
      }
      setStep("password");
      return;
    }

    setBusy(true);
    if (captchaEnabled && !captchaToken) {
      setError(t("Veuillez terminer la vérification anti-bot."));
      setBusy(false);
      return;
    }
    const raw = {
      name: submittedName,
      email: submittedEmail,
      password: String(f.get("password") || ""),
    };
    const validated = (mode === "register" ? registerSchema : loginSchema).safeParse(raw);
    if (!validated.success) {
      const issue = validated.error.issues[0];
      setError(issue ? translateIssue(issue) : t("Données invalides"));
      setBusy(false);
      return;
    }
    const { email, password } = validated.data;
    const fetchOptions = captchaToken ? { headers: { "x-captcha-response": captchaToken } } : undefined;
    if (mode === "register") {
      if (!("name" in validated.data) || typeof validated.data.name !== "string") {
        setError(t("Nom invalide"));
        setBusy(false);
        return;
      }
      const r = await authClient.signUp.email({
        name: validated.data.name,
        email,
        password,
        callbackURL: "/auth/continue",
        fetchOptions,
      });
      if (r.error) {
        setError(authResultErrorMessage(r.error, t("Inscription impossible")));
        setBusy(false);
        return;
      }
      // Vérification d'e-mail exigée : le compte est créé mais aucune session n'est ouverte. On l'explique au lieu
      // de renvoyer silencieusement vers la page de connexion.
      if (!r.data?.token) {
        setNotice(t("Compte créé. Vérifiez votre e-mail pour l’activer, puis connectez-vous."));
        setBusy(false);
        return;
      }
    } else {
      const r = await authClient.signIn.email({
        email,
        password,
        callbackURL: "/auth/continue",
        fetchOptions,
      });
      if (r.error) {
        // Anti-énumération : « compte introuvable » n'est jamais exposé distinctement à la connexion.
        const code = r.error.code === "USER_NOT_FOUND" ? "INVALID_EMAIL_OR_PASSWORD" : r.error.code;
        setError(authResultErrorMessage({ ...r.error, code }, t("Connexion impossible")));
        setBusy(false);
        return;
      }
      if (r.data && "twoFactorRedirect" in r.data && r.data.twoFactorRedirect) {
        const methods =
          "twoFactorMethods" in r.data && Array.isArray(r.data.twoFactorMethods) ? r.data.twoFactorMethods : [];
        if (methods.includes("otp")) {
          await authClient.twoFactor.sendOtp({ trustDevice: false });
          sessionStorage.setItem("owner-2fa-method", "otp");
        } else {
          sessionStorage.setItem("owner-2fa-method", "totp");
        }
        router.push("/two-factor");
        return;
      }
    }
    goToAuthenticatedSpace();
  }
  async function googleSignIn() {
    setBusy(true);
    setError("");
    if (canUseNativeGoogleSignIn(googleWebClientId)) {
      // Application Android/iOS : connexion native, la session reste dans l'application (pas de Chrome).
      try {
        const token = await nativeGoogleIdToken(googleWebClientId);
        const native = await authClient.signIn.social({ provider: "google", idToken: { token } });
        if (native?.error) throw new Error(authResultErrorMessage(native.error, t("Connexion Google impossible")));
        goToAuthenticatedSpace();
      } catch (nativeError) {
        const message = nativeError instanceof Error ? nativeError.message : "";
        if (message !== NATIVE_GOOGLE_CANCELLED) setError(message || t("Connexion Google impossible"));
        setBusy(false);
      }
      return;
    }
    const r = await authClient.signIn.social({
      provider: "google",
      callbackURL: "/auth/continue",
      errorCallbackURL: "/login",
    });
    if (r?.error) {
      setError(authResultErrorMessage(r.error, t("Connexion Google impossible")));
      setBusy(false);
    }
  }
  const isLogin = mode === "login";
  const isIdentityStep = step === "identity";
  const isPasswordStep = step === "password";
  return (
    <div className="auth-page">
      <div className="auth-panel">
        <div className="auth-logo-wrap">
          <AuthLogo />
        </div>
        <form className="auth-form" onSubmit={submit} noValidate>
          <div className="auth-stage" key={step}>
            {isPasswordStep && (
              <button
                className="auth-step-back"
                type="button"
                onClick={() => {
                  setStep("identity");
                  setError("");
                }}
              >
                <Icon i="arrow-left" size={17} /> {t("Retour")}
              </button>
            )}
            <h1>{isPasswordStep ? t("Votre mot de passe") : isLogin ? t("Connexion") : t("Créer un compte")}</h1>
            <p className="auth-subtitle">
              {isPasswordStep
                ? t("Saisissez votre mot de passe pour continuer")
                : isLogin
                  ? t("Renseignez votre adresse email pour accéder à votre compte")
                  : t("Rejoignez MusikPro et créez votre première chanson")}
            </p>
            {googleEnabled && !isPasswordStep && (
              <>
                <button className="auth-google" type="button" disabled={busy} onClick={googleSignIn}>
                  <GoogleLogo />
                  {isLogin ? t("Connectez-vous avec Google") : t("Créez votre compte avec Google")}
                </button>
                <div className="auth-divider">
                  <span>{t("OU")}</span>
                </div>
              </>
            )}
            {mode === "register" && isIdentityStep && (
              <label className="auth-field">
                <span>{t("Nom complet")}</span>
                <span className="auth-input">
                  <Icon i="user" size={17} />
                  <input
                    name="name"
                    autoComplete="name"
                    placeholder={t("Votre nom complet")}
                    value={identityName}
                    onChange={(event) => setIdentityName(event.target.value)}
                    autoFocus
                    required
                    minLength={2}
                  />
                </span>
              </label>
            )}
            {isIdentityStep && (
              <label className="auth-field">
                <span>{t("Adresse email")}</span>
                <span className="auth-input">
                  <Icon i="mail" size={17} />
                  <input
                    name="email"
                    type="email"
                    autoComplete="email"
                    placeholder={t("votre@email.com")}
                    value={identityEmail}
                    onChange={(event) => setIdentityEmail(event.target.value)}
                    autoFocus={isLogin}
                    required
                  />
                </span>
              </label>
            )}
            {isPasswordStep && (
              <button className="auth-email-summary" type="button" onClick={() => setStep("identity")}>
                <Icon i="mail" size={17} />
                <span>{identityEmail}</span>
                <span>{t("Modifier")}</span>
              </button>
            )}
            {isPasswordStep && (
              <label className="auth-field">
                <span>{t("Mot de passe")}</span>
                <span className="auth-input">
                  <Icon i="lock" size={17} />
                  <input
                    name="password"
                    type={passwordVisible ? "text" : "password"}
                    autoComplete={isLogin ? "current-password" : "new-password"}
                    placeholder={t("Votre mot de passe")}
                    autoFocus
                    required
                    minLength={10}
                  />
                  <button
                    type="button"
                    className="auth-eye"
                    onClick={() => setPasswordVisible((value) => !value)}
                    aria-label={passwordVisible ? t("Masquer le mot de passe") : t("Afficher le mot de passe")}
                  >
                    <Icon i={passwordVisible ? "eye-off" : "eye"} size={18} />
                  </button>
                </span>
                {!isLogin && <small>{t("Minimum 10 caractères")}</small>}
              </label>
            )}
            {isLogin && isPasswordStep && (
              <div className="auth-options">
                <label className="auth-check">
                  <input type="checkbox" defaultChecked />
                  <span>{t("Se souvenir de moi")}</span>
                </label>
                <Link href="/forgot-password">{t("Mot de passe oublié ?")}</Link>
              </div>
            )}
            {isPasswordStep && <TurnstileWidget onToken={setCaptchaToken} />}
            {notice && <InlineNotice tone="success">{notice}</InlineNotice>}
            {displayedError && (
              <p className="auth-alert auth-alert-error" role="alert">
                {displayedError}
              </p>
            )}
            <button className="auth-submit" disabled={busy}>
              {busy
                ? t("Traitement…")
                : isIdentityStep
                  ? t("Continuer")
                  : mode === "login"
                    ? t("Se connecter")
                    : t("Continuer")}
            </button>
            {!isLogin && isPasswordStep && (
              <p className="auth-legal">
                {t("En créant un compte, vous acceptez nos")} <Link href="/terms">{t("conditions d’utilisation")}</Link>{" "}
                {t("et notre")} <Link href="/privacy">{t("politique de confidentialité")}</Link>.
              </p>
            )}
            {!isPasswordStep && (
              <p className="auth-switch">
                {isLogin ? t("Pas de compte ?") : t("Vous avez déjà un compte ?")}{" "}
                <Link href={isLogin ? "/register" : "/login"}>
                  {isLogin ? t("Créer un compte") : t("Se connecter")}
                </Link>
              </p>
            )}
          </div>
        </form>
      </div>
    </div>
  );
}
