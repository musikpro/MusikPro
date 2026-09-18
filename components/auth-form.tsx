"use client";
import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { authClient } from "@/lib/auth/client";
import { TurnstileWidget } from "@/components/turnstile-widget";
import { loginSchema, registerSchema } from "@/lib/validation/auth";

export function AuthForm({ mode }: { mode: "login" | "register" }) {
  const router = useRouter();
  const [error,setError]=useState(""); const [busy,setBusy]=useState(false); const [captchaToken,setCaptchaToken]=useState("");
  const captchaEnabled = Boolean(process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY);
  async function submit(e:FormEvent<HTMLFormElement>){
    e.preventDefault(); setBusy(true); setError("");
    if(captchaEnabled && !captchaToken){ setError("Veuillez terminer la vérification anti-bot."); setBusy(false); return; }
    const f=new FormData(e.currentTarget);
    const raw={name:String(f.get("name")||""),email:String(f.get("email")||""),password:String(f.get("password")||"")};
    const validated=(mode==="register"?registerSchema:loginSchema).safeParse(raw);
    if(!validated.success){setError(validated.error.issues[0]?.message||"Données invalides");setBusy(false);return;}
    const {email,password}=validated.data;
    const fetchOptions = captchaToken ? { headers: { "x-captcha-response": captchaToken } } : undefined;
    if(mode==="register"){
      const r=await authClient.signUp.email({name:(validated.data as {name:string}).name,email,password,callbackURL:"/dashboard",fetchOptions});
      if(r.error){setError(r.error.message||"Inscription impossible");setBusy(false);return;}
    } else {
      const r=await authClient.signIn.email({email,password,callbackURL:"/dashboard",fetchOptions});
      if(r.error){setError(r.error.message||"Connexion impossible");setBusy(false);return;}
      if((r.data as any)?.twoFactorRedirect){router.push("/two-factor");return;}
    }
    router.push("/dashboard"); router.refresh();
  }
  async function googleSignIn(){
    setBusy(true); setError("");
    const r = await authClient.signIn.social({ provider: "google", callbackURL: "/dashboard" });
    if (r?.error) { setError(r.error.message || "Connexion Google impossible"); setBusy(false); }
  }
  const googleEnabled = process.env.NEXT_PUBLIC_GOOGLE_AUTH_ENABLED === "true";
  return <form className="form" onSubmit={submit}><h1>{mode==="login"?"Connexion":"Créer un compte"}</h1>{googleEnabled&&<><button className="btn secondary" type="button" disabled={busy} onClick={googleSignIn}>Continuer avec Google</button><p className="muted">ou</p></>}{mode==="register"&&<label className="field">Nom<input name="name" required minLength={2}/></label>}<label className="field">E-mail<input name="email" type="email" required/></label><label className="field">Mot de passe<input name="password" type="password" required minLength={10}/></label><TurnstileWidget onToken={setCaptchaToken}/>{error&&<p className="error">{error}</p>}<button className="btn" disabled={busy}>{busy?"Traitement…":mode==="login"?"Se connecter":"S'inscrire"}</button>{mode==="login"&&<p><Link href="/forgot-password">Mot de passe oublié ?</Link></p>}</form>
}
