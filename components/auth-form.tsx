"use client";
import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { authClient } from "@/lib/auth/client";
import { canUseNativeGoogleSignIn, NATIVE_GOOGLE_CANCELLED, nativeGoogleIdToken } from "@/lib/auth/native-google";
import { TurnstileWidget } from "@/components/turnstile-widget";
import { emailSchema, loginSchema, registerIdentitySchema, registerSchema } from "@/lib/validation/auth";
import Icon from "@/components/banani/Icon";
import { AuthLogo, GoogleLogo } from "@/components/auth/auth-ui";

export function AuthForm({
  mode,
  googleEnabled = false,
  googleWebClientId,
  initialError = "",
}: {
  mode: "login" | "register";
  googleEnabled?: boolean;
  /** Identifiant client Google « Web » (public) : requis par la connexion Google native de l'application. */
  googleWebClientId?: string;
  initialError?: string;
}) {
  const router = useRouter();
  const [error, setError] = useState(initialError);
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
    const f = new FormData(e.currentTarget);
    const submittedEmail = String(f.get("email") || identityEmail);
    const submittedName = String(f.get("name") || identityName);

    if (step === "identity") {
      if (mode === "register") {
        const parsedIdentity = registerIdentitySchema.safeParse({ name: submittedName, email: submittedEmail });
        if (!parsedIdentity.success) {
          setError(parsedIdentity.error.issues[0]?.message || "Données invalides");
          return;
        }
        setIdentityName(parsedIdentity.data.name);
        setIdentityEmail(parsedIdentity.data.email);
      } else {
        const parsedEmail = emailSchema.safeParse(submittedEmail);
        if (!parsedEmail.success) {
          setError(parsedEmail.error.issues[0]?.message || "E-mail invalide");
          return;
        }
        setIdentityEmail(parsedEmail.data);
      }
      setStep("password");
      return;
    }

    setBusy(true);
    if (captchaEnabled && !captchaToken) {
      setError("Veuillez terminer la vérification anti-bot.");
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
    if (canUseNativeGoogleSignIn(googleWebClientId)) {
      // Application Android/iOS : connexion native, la session reste dans l'application (pas de Chrome).
      try {
        const token = await nativeGoogleIdToken(googleWebClientId);
        const native = await authClient.signIn.social({ provider: "google", idToken: { token } });
        if (native?.error) throw new Error(native.error.message || "Connexion Google impossible");
        // Navigation complète plutôt que router.push + router.refresh : /auth/continue est une page
        // serveur qui redirige ; en WebView sur un vrai téléphone, les deux navigations client se
        // télescopaient et laissaient une page blanche tant que l'application n'était pas relancée.
        window.location.assign(new URL("/auth/continue", window.location.origin).toString());
      } catch (nativeError) {
        const message = nativeError instanceof Error ? nativeError.message : "";
        if (message !== NATIVE_GOOGLE_CANCELLED) setError(message || "Connexion Google impossible");
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
      setError(r.error.message || "Connexion Google impossible");
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
                <Icon i="arrow-left" size={17} /> Retour
              </button>
            )}
            <h1>{isPasswordStep ? "Votre mot de passe" : isLogin ? "Connexion" : "Créer un compte"}</h1>
            <p className="auth-subtitle">
              {isPasswordStep
                ? "Saisissez votre mot de passe pour continuer"
                : isLogin
                  ? "Renseignez votre adresse email pour accéder à votre compte"
                  : "Rejoignez MusikPro et créez votre première chanson"}
            </p>
            {googleEnabled && !isPasswordStep && (
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
            {mode === "register" && isIdentityStep && (
              <label className="auth-field">
                <span>Nom complet</span>
                <span className="auth-input">
                  <Icon i="user" size={17} />
                  <input
                    name="name"
                    autoComplete="name"
                    placeholder="Votre nom complet"
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
                <span>Adresse email</span>
                <span className="auth-input">
                  <Icon i="mail" size={17} />
                  <input
                    name="email"
                    type="email"
                    autoComplete="email"
                    placeholder="votre@email.com"
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
                <span>Modifier</span>
              </button>
            )}
            {isPasswordStep && (
              <label className="auth-field">
                <span>Mot de passe</span>
                <span className="auth-input">
                  <Icon i="lock" size={17} />
                  <input
                    name="password"
                    type={passwordVisible ? "text" : "password"}
                    autoComplete={isLogin ? "current-password" : "new-password"}
                    placeholder="Votre mot de passe"
                    autoFocus
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
            {isLogin && isPasswordStep && (
              <div className="auth-options">
                <label className="auth-check">
                  <input type="checkbox" defaultChecked />
                  <span>Se souvenir de moi</span>
                </label>
                <Link href="/forgot-password">Mot de passe oublié ?</Link>
              </div>
            )}
            {isPasswordStep && <TurnstileWidget onToken={setCaptchaToken} />}
            {error && (
              <p className="auth-alert auth-alert-error" role="alert">
                {error}
              </p>
            )}
            <button className="auth-submit" disabled={busy}>
              {busy ? "Traitement…" : isIdentityStep ? "Continuer" : mode === "login" ? "Se connecter" : "Continuer"}
            </button>
            {!isLogin && isPasswordStep && (
              <p className="auth-legal">
                En créant un compte, vous acceptez nos <Link href="/terms">conditions d’utilisation</Link> et notre{" "}
                <Link href="/privacy">politique de confidentialité</Link>.
              </p>
            )}
            {!isPasswordStep && (
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
