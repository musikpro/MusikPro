"use client";
import { useEffect } from "react";

/**
 * Navigation initiée par la page elle-même (sans geste) vers une route interne. Utilisée par /auth/continue dans
 * Chrome : une redirection serveur vers /dashboard serait interceptée par le lien d'application Android et
 * ouvrirait l'application sans session (le cookie est resté dans Chrome).
 */
export function ClientRedirect({ to }: { to: string }) {
  useEffect(() => {
    window.location.replace(new URL(to, window.location.origin).toString());
  }, [to]);
  return null;
}
