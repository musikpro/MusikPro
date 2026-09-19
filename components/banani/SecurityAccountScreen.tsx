"use client";

import { TwoFactorSetup } from "@/components/two-factor-setup";
import Icon from "./Icon";
import MobileBottomNav from "./MobileBottomNav";
import MobileTopBar from "./MobileTopBar";
import { useDemo } from "./DemoProvider";

export default function SecurityAccountScreen({
  emailVerified,
  twoFactorEnabled,
  required,
}: {
  emailVerified: boolean;
  twoFactorEnabled: boolean;
  required: boolean;
}) {
  const demo = useDemo();
  return (
    <div className="security-screen bg-background flex flex-col">
      <MobileTopBar credits={3} />
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
          <div className="security-required" role="alert">
            <Icon i="circle-alert" size={17} />
            Le double facteur doit être activé avant d’accéder à l’administration.
          </div>
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
          <article className={twoFactorEnabled ? "is-secure" : "is-warning"}>
            <span>
              <Icon i="smartphone" size={19} />
            </span>
            <div>
              <small>Double facteur</small>
              <strong>{twoFactorEnabled ? "Activé" : "À activer"}</strong>
            </div>
          </article>
        </div>

        <section className="security-panel">
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
        </section>

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
