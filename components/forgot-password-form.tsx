"use client";
import { FormEvent,useState } from "react";
import { authClient } from "@/lib/auth/client";
import { TurnstileWidget } from "@/components/turnstile-widget";
import { forgotPasswordSchema } from "@/lib/validation/auth";

export function ForgotPasswordForm(){
  const[msg,setMsg]=useState(""); const[error,setError]=useState(""); const[captchaToken,setCaptchaToken]=useState("");
  const captchaEnabled=Boolean(process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY);
  async function submit(e:FormEvent<HTMLFormElement>){
    e.preventDefault(); setError("");
    if(captchaEnabled&&!captchaToken){setError("Veuillez terminer la vérification anti-bot.");return;}
    const parsed=forgotPasswordSchema.safeParse({email:String(new FormData(e.currentTarget).get("email")||"")});
    if(!parsed.success){setError(parsed.error.issues[0]?.message||"E-mail invalide");return;}
    const {email}=parsed.data;
    await authClient.requestPasswordReset({email,redirectTo:`${window.location.origin}/reset-password`,fetchOptions:captchaToken?{headers:{"x-captcha-response":captchaToken}}:undefined});
    setMsg("Si ce compte existe, un e-mail de réinitialisation a été envoyé.");
  }
  return <form className="form" onSubmit={submit}><h1>Mot de passe oublié</h1><label className="field">E-mail<input name="email" type="email" required/></label><TurnstileWidget onToken={setCaptchaToken}/><button className="btn">Envoyer le lien</button>{error&&<p className="error">{error}</p>}{msg&&<p className="success">{msg}</p>}</form>
}
