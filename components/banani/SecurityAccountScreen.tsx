"use client";

import { TwoFactorSetup } from "@/components/two-factor-setup";
import Icon from "./Icon";
import MobileBottomNav from "./MobileBottomNav";
import MobileTopBar from "./MobileTopBar";
import { useDemo } from "./DemoProvider";
import { InlineNotice } from "@/components/ui/inline-notice";

export default function SecurityAccountScreen({
  emailVerified,
  twoFactorEnabled,
  twoFactorAvailable,
  required,
  isOwner,
}: {
  emailVerified: boolean;
  twoFactorEnabled: boolean;
  twoFactorAvailable: boolean;
  required: boolean;
  isOwner: boolean;
}) {
  const demo = useDemo();
  return (
    <div className="security-screen bg-background flex flex-col">
      <MobileTopBar credits={demo.balance} />
      <div className="security-top-nav">
        <button type="button" onClick={() => demo.go("/dashboard/profile")}>
          <Icon i="arrow-left" size={18} /> Retour au profil
        </button>
        <span>Sécurité</span>
      </div>

      <div className="security-content">
        <section className="security-hero">
          <span className="security-hero-icon">
            <Icon i="shield-check" size={28} />
          </span>
          <div>
            <p className="security-eyebrow">Protection du compte</p>
            <h1>Mot de passe et sécurité</h1>
            <p>Renforce la protection de tes chansons et de tes informations personnelles.</p>
          </div>
        </section>

        {required && (
          <InlineNotice tone="error" className="security-required">
            Le double facteur doit être activé avant d’accéder à l’administration.
          </InlineNotice>
        )}

        <div className="security-status-grid">
          <article className={emailVerified ? "is-secure" : "is-warning"}>
            <span>
              <Icon i="mail-check" size={19} />
            </span>
            <div>
              <small>Adresse e-mail</small>
              <strong>{emailVerified ? "Vérifiée" : "À vérifier"}</strong>
            </div>
          </article>
          {isOwner && (
            <article className={twoFactorAvailable && twoFactorEnabled ? "is-secure" : "is-warning"}>
              <span><Icon i="smartphone" size={19} /></span>
              <div>
                <small>Double facteur propriétaire</small>
                <strong>
                  {twoFactorAvailable ? (twoFactorEnabled ? "Activé" : "À activer") : "Désactivé temporairement"}
                </strong>
              </div>
            </article>
          )}
        </div>

        {isOwner && twoFactorAvailable && <section className="security-panel">
          <div className="security-panel-heading">
            <span>
              <Icon i="key-round" size={20} />
            </span>
            <div>
              <h2>Authentification renforcée</h2>
              <p>Utilise une application comme Google Authenticator pour protéger la connexion.</p>
            </div>
          </div>
          <TwoFactorSetup enabled={twoFactorEnabled} />
        </section>}

        {isOwner && !twoFactorAvailable && (
          <InlineNotice tone="info">
            Le double facteur propriétaire est temporairement désactivé. Tu peux accéder à l’administration avec ton compte habituel.
          </InlineNotice>
        )}

        <section className="security-tips">
          <h2>
            <Icon i="badge-check" size={18} /> Les bons réflexes
          </h2>
          <ul>
            <li>
              <Icon i="check" size={14} /> Utilise un mot de passe unique pour MusikPro.
            </li>
            <li>
              <Icon i="check" size={14} /> Garde tes codes de secours dans un endroit privé.
            </li>
            <li>
              <Icon i="check" size={14} /> Ne communique jamais un code reçu ou généré.
            </li>
          </ul>
        </section>
      </div>
      <MobileBottomNav activeTab="Profil" />
    </div>
  );
}
