"use client";
import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { authClient } from "@/lib/auth/client";
import { TurnstileWidget } from "@/components/turnstile-widget";
import { emailSchema, loginSchema, registerSchema } from "@/lib/validation/auth";
import Icon from "@/components/banani/Icon";
import { AuthLogo, GoogleLogo } from "@/components/auth/auth-ui";

export function AuthForm({
  mode,
  googleEnabled = false,
  initialError = "",
}: {
  mode: "login" | "register";
  googleEnabled?: boolean;
  initialError?: string;
}) {
  const router = useRouter();
  const [error, setError] = useState(initialError);
  const [busy, setBusy] = useState(false);
  const [captchaToken, setCaptchaToken] = useState("");
  const [passwordVisible, setPasswordVisible] = useState(false);
  const [loginStep, setLoginStep] = useState<"email" | "password">("email");
  const [loginEmail, setLoginEmail] = useState("");
  const captchaEnabled = Boolean(process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY);
  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    const f = new FormData(e.currentTarget);
    const submittedEmail = String(f.get("email") || loginEmail);

    if (mode === "login" && loginStep === "email") {
      const parsedEmail = emailSchema.safeParse(submittedEmail);
      if (!parsedEmail.success) {
        setError(parsedEmail.error.issues[0]?.message || "E-mail invalide");
        return;
      }
      setLoginEmail(parsedEmail.data);
      setLoginStep("password");
      return;
    }

    setBusy(true);
    if (captchaEnabled && !captchaToken) {
      setError("Veuillez terminer la vérification anti-bot.");
      setBusy(false);
      return;
    }
    const raw = {
      name: String(f.get("name") || ""),
      email: submittedEmail,
      password: String(f.get("password") || ""),
    };
    const validated = (mode === "register" ? registerSchema : loginSchema).safeParse(raw);
    if (!validated.success) {
      setError(validated.error.issues[0]?.message || "Données invalides");
      setBusy(false);
      return;
    }
    const { email, password } = validated.data;
    const fetchOptions = captchaToken ? { headers: { "x-captcha-response": captchaToken } } : undefined;
    if (mode === "register") {
      if (!("name" in validated.data) || typeof validated.data.name !== "string") {
        setError("Nom invalide");
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
        setError(r.error.message || "Inscription impossible");
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
        setError(r.error.message || "Connexion impossible");
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
    router.push("/auth/continue");
    router.refresh();
  }
  async function googleSignIn() {
    setBusy(true);
    setError("");
    const r = await authClient.signIn.social({
      provider: "google",
      callbackURL: "/auth/continue",
      errorCallbackURL: "/login",
    });
    if (r?.error) {
      setError(r.error.message || "Connexion Google impossible");
      setBusy(false);
    }
  }
  const isLogin = mode === "login";
  const isLoginEmailStep = isLogin && loginStep === "email";
  const isLoginPasswordStep = isLogin && loginStep === "password";
  return (
    <div className="auth-page">
      <div className="auth-panel">
        <div className="auth-logo-wrap">
          <AuthLogo />
        </div>
        <form className="auth-form" onSubmit={submit} noValidate>
          <div className="auth-stage" key={isLogin ? loginStep : "register"}>
            {isLoginPasswordStep && (
              <button
                className="auth-step-back"
                type="button"
                onClick={() => {
                  setLoginStep("email");
                  setError("");
                }}
              >
                <Icon i="arrow-left" size={17} /> Retour
              </button>
            )}
            <h1>{isLoginPasswordStep ? "Votre mot de passe" : isLogin ? "Connexion" : "Créer un compte"}</h1>
            <p className="auth-subtitle">
              {isLoginPasswordStep
                ? "Saisissez votre mot de passe pour continuer"
                : isLogin
                  ? "Renseignez votre adresse email pour accéder à votre compte"
                  : "Rejoignez MusikPro et créez votre première chanson"}
            </p>
            {googleEnabled && !isLoginPasswordStep && (
              <>
                <button className="auth-google" type="button" disabled={busy} onClick={googleSignIn}>
                  <GoogleLogo />
                  {isLogin ? "Connectez-vous avec Google" : "Créez votre compte avec Google"}
                </button>
                <div className="auth-divider">
                  <span>OU</span>
                </div>
              </>
            )}
            {mode === "register" && (
              <label className="auth-field">
                <span>Nom complet</span>
                <span className="auth-input">
                  <Icon i="user" size={17} />
                  <input name="name" autoComplete="name" placeholder="Votre nom complet" required minLength={2} />
                </span>
              </label>
            )}
            {(mode === "register" || isLoginEmailStep) && (
              <label className="auth-field">
                <span>Adresse email</span>
                <span className="auth-input">
                  <Icon i="mail" size={17} />
                  <input
                    name="email"
                    type="email"
                    autoComplete="email"
                    placeholder="votre@email.com"
                    value={isLogin ? loginEmail : undefined}
                    onChange={isLogin ? (event) => setLoginEmail(event.target.value) : undefined}
                    autoFocus={isLoginEmailStep}
                    required
                  />
                </span>
              </label>
            )}
            {isLoginPasswordStep && (
              <button className="auth-email-summary" type="button" onClick={() => setLoginStep("email")}>
                <Icon i="mail" size={17} />
                <span>{loginEmail}</span>
                <span>Modifier</span>
              </button>
            )}
            {(mode === "register" || isLoginPasswordStep) && (
              <label className="auth-field">
                <span>Mot de passe</span>
                <span className="auth-input">
                  <Icon i="lock" size={17} />
                  <input
                    name="password"
                    type={passwordVisible ? "text" : "password"}
                    autoComplete={isLogin ? "current-password" : "new-password"}
                    placeholder="Votre mot de passe"
                    autoFocus={isLoginPasswordStep}
                    required
                    minLength={10}
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
                {!isLogin && <small>Minimum 10 caractères</small>}
              </label>
            )}
            {isLoginPasswordStep && (
              <div className="auth-options">
                <label className="auth-check">
                  <input type="checkbox" defaultChecked />
                  <span>Se souvenir de moi</span>
                </label>
                <Link href="/forgot-password">Mot de passe oublié ?</Link>
              </div>
            )}
            {(mode === "register" || isLoginPasswordStep) && <TurnstileWidget onToken={setCaptchaToken} />}
            {error && (
              <p className="auth-alert auth-alert-error" role="alert">
                {error}
              </p>
            )}
            <button className="auth-submit" disabled={busy}>
              {busy ? "Traitement…" : isLoginEmailStep ? "Continuer" : mode === "login" ? "Se connecter" : "Continuer"}
            </button>
            {!isLogin && (
              <p className="auth-legal">
                En créant un compte, vous acceptez nos <Link href="/terms">conditions d’utilisation</Link> et notre{" "}
                <Link href="/privacy">politique de confidentialité</Link>.
              </p>
            )}
            {!isLoginPasswordStep && (
              <p className="auth-switch">
                {isLogin ? "Pas de compte ? " : "Vous avez déjà un compte ? "}
                <Link href={isLogin ? "/register" : "/login"}>{isLogin ? "Créer un compte" : "Se connecter"}</Link>
              </p>
            )}
          </div>
        </form>
      </div>
    </div>
  );
}
