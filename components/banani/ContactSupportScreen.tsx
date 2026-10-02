"use client";

import { useState } from "react";
import { demoSupportSchema } from "@/lib/validation/musikpro-demo";
import { apiFetch } from "@/lib/api/client";
import { useDemo } from "./DemoProvider";
import DemoField from "./DemoField";
import Icon from "./Icon";
import MusikSelect from "./MusikSelect";
import { translate as t } from "@/lib/i18n/translate";

export const displayName = "Contacter le support";
export const screenSize = "mobile";

export default function ContactSupportScreen() {
  const demo = useDemo();
  const [submitting, setSubmitting] = useState(false);

  const submitSupportRequest = async () => {
    const parsed = demoSupportSchema.safeParse({
      subject: demo.fields["support.subject"],
      category: demo.fields["support.category"],
      message: demo.fields["support.message"],
      email: demo.fields["support.email"],
      phone: demo.fields["support.phone"],
    });
    if (!parsed.success) {
      demo.notify(t("Complète le sujet, un message de 10 caractères minimum et un email valide."));
      return;
    }
    if (demo.isDemo) {
      demo.notify(t("Formulaire valide. Aucun email n’est envoyé depuis la démonstration."), { demoOnly: true });
      return;
    }
    setSubmitting(true);
    try {
      await apiFetch("/api/support", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(parsed.data),
      });
      demo.field("support.subject", "");
      demo.field("support.message", "");
      demo.field("support.phone", "");
      demo.notify(t("Ton message a bien été envoyé au support MusikPro."));
    } catch (error) {
      demo.notify(error instanceof Error ? error.message : t("Le message n’a pas pu être envoyé."));
    } finally {
      setSubmitting(false);
    }
  };
  return (
    <div className="support-screen bg-background flex flex-col">
      <div className="support-top-nav">
        <button type="button" data-demo-ready onClick={() => demo.go("/dashboard/help")}>
          <Icon i="arrow-left" size={18} /> {t("Retour")}
        </button>
        <span>{t("Centre d’aide")}</span>
      </div>

      <div className="support-content flex-1 px-4 py-5 overflow-y-auto">
        <section className="support-intro">
          <span className="support-intro-icon">
            <Icon i="headphones" size={24} />
          </span>
          <div>
            <p className="support-eyebrow">{t("Support MusikPro")}</p>
            <h1>{t("Nous sommes ici pour vous aider")}</h1>
            <p>{t("Décris ta demande. Notre équipe te répondra avec une solution claire.")}</p>
          </div>
        </section>

        <section className="support-form-card" aria-label={t("Formulaire de support")}>
          <div className="support-card-heading">
            <span>
              <Icon i="message-square-text" size={18} />
            </span>
            <div>
              <h2>{t("Parle-nous de ta demande")}</h2>
              <p>{t("Ces informations nous aident à mieux te répondre.")}</p>
            </div>
          </div>

          <label className="support-field">
            <span>{t("Sujet")}</span>
            <span className="support-input-shell">
              <Icon i="mail" size={17} />
              <DemoField
                name="support.subject"
                label={t("Sujet")}
                placeholder={t("Ex. Problème avec ma chanson")}
                multiline={false}
                type="text"
                maxLength={254}
              />
            </span>
          </label>

          <div className="support-field">
            <span>{t("Catégorie")}</span>
            <MusikSelect
              className="support-category-select"
              icon="list"
              ariaLabel={t("Catégorie")}
              value={demo.fields["support.category"]}
              onChange={(value) => demo.field("support.category", value)}
              options={[
                { value: "Problème technique", label: t("Problème technique") },
                { value: "Compte", label: t("Compte") },
                { value: "Crédits", label: t("Crédits") },
              ]}
            />
          </div>

          <label className="support-field">
            <span>{t("Votre message")}</span>
            <span className="support-input-shell is-message">
              <DemoField
                name="support.message"
                label={t("Votre message")}
                placeholder={t("Décris le problème et ce que tu essayais de faire...")}
                multiline
                type="text"
                maxLength={5000}
              />
            </span>
          </label>
        </section>

        <section className="support-contact-card">
          <div className="support-card-heading is-compact">
            <span>
              <Icon i="phone-call" size={18} />
            </span>
            <div>
              <h2>{t("Comment pouvons-nous te joindre ?")}</h2>
              <p>{t("Ces informations servent uniquement à cette demande.")}</p>
            </div>
          </div>
          <div className="support-contact-grid">
            <label className="support-field">
              <span>{t("Email")}</span>
              <span className="support-input-shell">
                <Icon i="at-sign" size={17} />
                <DemoField
                  name="support.email"
                  label={t("Email")}
                  placeholder="kofi@example.com"
                  multiline={false}
                  type="email"
                  maxLength={254}
                />
              </span>
            </label>
            <label className="support-field">
              <span>
                {t("Téléphone")} <small>{t("optionnel")}</small>
              </span>
              <span className="support-input-shell">
                <Icon i="phone" size={17} />
                <DemoField
                  name="support.phone"
                  label={t("Téléphone")}
                  placeholder="+225 XX XX XX XX"
                  multiline={false}
                  type="tel"
                  maxLength={254}
                />
              </span>
            </label>
          </div>
        </section>

        <div className="support-response-note">
          <Icon i="clock-3" size={17} />
          <p>
            <strong>{t("Réponse sous 24 heures")}</strong>
            <span>{t("Tu recevras une réponse sur l’adresse indiquée.")}</span>
          </p>
        </div>
      </div>

      <div className="support-actions">
        <button
          type="button"
          data-demo-ready
          className="support-submit"
          disabled={submitting}
          onClick={() => void submitSupportRequest()}
        >
          <Icon i="send" size={19} /> {submitting ? t("Envoi en cours…") : t("Envoyer mon message")}
        </button>
        <button type="button" data-demo-ready className="support-cancel" onClick={() => demo.go("/dashboard/help")}>
          {t("Annuler")}
        </button>
      </div>
    </div>
  );
}
