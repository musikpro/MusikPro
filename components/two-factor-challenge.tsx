"use client";
import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { authClient } from "@/lib/auth/client";
import { twoFactorCodeSchema } from "@/lib/validation/auth";
export function TwoFactorChallenge() {
  const router = useRouter();
  const [error, setError] = useState("");
  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    const parsed = twoFactorCodeSchema.safeParse({
      code: String(new FormData(e.currentTarget).get("code") || ""),
    });
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message || "Code invalide");
      return;
    }
    const r = await authClient.twoFactor.verifyTotp({
      code: parsed.data.code,
      trustDevice: true,
    });
    if (r.error) {
      setError(r.error.message || "Code invalide");
      return;
    }
    router.push("/dashboard");
    router.refresh();
  }
  return (
    <form className="form" onSubmit={submit}>
      <h1>Vérification 2FA</h1>
      <p className="muted">
        Saisissez le code généré par votre application d’authentification.
      </p>
      <label className="field">
        Code
        <input
          name="code"
          inputMode="numeric"
          autoComplete="one-time-code"
          pattern="[0-9]{6}"
          required
        />
      </label>
      {error && <p className="error">{error}</p>}
      <button className="btn">Vérifier</button>
    </form>
  );
}
