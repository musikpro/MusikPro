"use client";
import { FormEvent, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { authClient } from "@/lib/auth/client";
import { resetPasswordSchema } from "@/lib/validation/auth";

export function ResetPasswordForm(){
  const params=useSearchParams(); const router=useRouter(); const [message,setMessage]=useState("");
  const token=params.get("token"); const invalid=params.get("error");
  async function submit(e:FormEvent<HTMLFormElement>){e.preventDefault();if(!token)return;const parsed=resetPasswordSchema.safeParse({password:String(new FormData(e.currentTarget).get("password")||""),token});if(!parsed.success){setMessage(parsed.error.issues[0]?.message||"Données invalides");return;}const r=await authClient.resetPassword({newPassword:parsed.data.password,token:parsed.data.token});if(r.error){setMessage(r.error.message||"Lien invalide ou expiré");return;}setMessage("Mot de passe modifié. Vous pouvez vous reconnecter.");setTimeout(()=>router.push("/login"),700)}
  if(invalid||!token)return <div className="form"><h1>Lien invalide</h1><p className="error">Le lien de réinitialisation est invalide ou expiré.</p></div>;
  return <form className="form" onSubmit={submit}><h1>Nouveau mot de passe</h1><label className="field">Mot de passe<input type="password" name="password" minLength={10} required/></label><button className="btn">Modifier le mot de passe</button>{message&&<p>{message}</p>}</form>
}
