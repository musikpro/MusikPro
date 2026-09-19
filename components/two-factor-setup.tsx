"use client";
import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { authClient } from "@/lib/auth/client";
import { twoFactorCodeSchema, twoFactorEnableSchema } from "@/lib/validation/auth";

export function TwoFactorSetup({ enabled }: { enabled: boolean }) {
  const router = useRouter();
  const [uri, setUri] = useState("");
  const [codes, setCodes] = useState<string[]>([]);
  const [message, setMessage] = useState("");
  async function enable(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setMessage("");
    const parsed = twoFactorEnableSchema.safeParse({
      password: String(new FormData(e.currentTarget).get("password") || ""),
    });
    if (!parsed.success) {
      setMessage(parsed.error.issues[0]?.message || "Mot de passe invalide");
      return;
    }
    const r = await authClient.twoFactor.enable({
      password: parsed.data.password,
      method: "totp",
    });
    if (r.error) {
      setMessage(r.error.message || "Impossible d'activer le 2FA");
      return;
    }
    const d = r.data;
    if (!d || d.method !== "totp") {
      setMessage("Configuration TOTP indisponible.");
      return;
    }
    setUri(d.totpURI);
    setCodes(d.backupCodes);
    setMessage("Scannez/ajoutez le secret dans votre application d’authentification, puis validez le code.");
  }
  async function verify(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const parsed = twoFactorCodeSchema.safeParse({
      code: String(new FormData(e.currentTarget).get("code") || ""),
    });
    if (!parsed.success) {
      setMessage(parsed.error.issues[0]?.message || "Code invalide");
      return;
    }
    const r = await authClient.twoFactor.verifyTotp({
      code: parsed.data.code,
      trustDevice: false,
    });
    if (r.error) {
      setMessage(r.error.message || "Code invalide");
      return;
    }
    setMessage("2FA activé. Redirection vers votre espace…");
    setUri("");
    router.push("/auth/continue");
    router.refresh();
  }
  if (enabled)
    return (
      <div className="card security-2fa-card is-enabled">
        <h2>Authentification à deux facteurs</h2>
        <p className="success">2FA activé sur votre compte.</p>
      </div>
    );
  return (
    <div className="card security-2fa-card">
      <h2>Activer le 2FA (TOTP)</h2>
      <form onSubmit={enable} className="security-2fa-form">
        <label className="field">
          Mot de passe actuel
          <input type="password" name="password" required />
        </label>
        <button className="btn security-primary-button">Commencer l’activation</button>
      </form>
      {uri && (
        <>
          <p className="muted">URI TOTP (à ouvrir/importer dans votre application d’authentification) :</p>
          <code style={{ wordBreak: "break-all" }}>{uri}</code>
          {codes.length > 0 && (
            <div className="notice">
              <strong>Codes de secours — conservez-les hors ligne :</strong>
              <p>{codes.join(" · ")}</p>
            </div>
          )}
          <form onSubmit={verify} className="security-2fa-form">
            <label className="field">
              Code à 6 chiffres
              <input name="code" inputMode="numeric" pattern="[0-9]{6}" required />
            </label>
            <button className="btn security-primary-button">Valider le 2FA</button>
          </form>
        </>
      )}
      {message && <p>{message}</p>}
    </div>
  );
}
