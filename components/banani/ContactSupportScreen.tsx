"use client";

import { useState } from "react";
import { demoSupportSchema } from "@/lib/validation/musikpro-demo";
import { apiFetch } from "@/lib/api/client";
import { useDemo } from "./DemoProvider";
import DemoField from "./DemoField";
import Icon from "./Icon";
import MusikSelect from "./MusikSelect";

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
      demo.notify("Complète le sujet, un message de 10 caractères minimum et un email valide.");
      return;
    }
    if (demo.isDemo) {
      demo.notify("Formulaire valide. Aucun email n’est envoyé depuis la démonstration.");
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
      demo.notify("Ton message a bien été envoyé au support MusikPro.");
    } catch (error) {
      demo.notify(error instanceof Error ? error.message : "Le message n’a pas pu être envoyé.");
    } finally {
      setSubmitting(false);
    }
  };
  return (
    <div className="support-screen bg-background flex flex-col">
      <div className="support-top-nav">
        <button type="button" data-demo-ready onClick={() => demo.go("/dashboard/help")}>
          <Icon i="arrow-left" size={18} /> Retour
        </button>
        <span>Centre d’aide</span>
      </div>

      <div className="support-content flex-1 px-4 py-5 overflow-y-auto">
        <section className="support-intro">
          <span className="support-intro-icon">
            <Icon i="headphones" size={24} />
          </span>
          <div>
            <p className="support-eyebrow">Support MusikPro</p>
            <h1>Nous sommes ici pour vous aider</h1>
            <p>Décris ta demande. Notre équipe te répondra avec une solution claire.</p>
          </div>
        </section>

        <section className="support-form-card" aria-label="Formulaire de support">
          <div className="support-card-heading">
            <span>
              <Icon i="message-square-text" size={18} />
            </span>
            <div>
              <h2>Parle-nous de ta demande</h2>
              <p>Ces informations nous aident à mieux te répondre.</p>
            </div>
          </div>

          <label className="support-field">
            <span>Sujet</span>
            <span className="support-input-shell">
              <Icon i="mail" size={17} />
              <DemoField
                name="support.subject"
                label="Sujet"
                placeholder="Ex. Problème avec ma chanson"
                multiline={false}
                type="text"
                maxLength={254}
              />
            </span>
          </label>

          <div className="support-field">
            <span>Catégorie</span>
            <MusikSelect
              className="support-category-select"
              icon="list"
              ariaLabel="Catégorie"
              value={demo.fields["support.category"]}
              onChange={(value) => demo.field("support.category", value)}
              options={["Problème technique", "Compte", "Crédits"].map((label) => ({ value: label, label }))}
            />
          </div>

          <label className="support-field">
            <span>Votre message</span>
            <span className="support-input-shell is-message">
              <DemoField
                name="support.message"
                label="Votre message"
                placeholder="Décris le problème et ce que tu essayais de faire..."
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
              <h2>Comment pouvons-nous te joindre ?</h2>
              <p>Ces informations servent uniquement à cette demande.</p>
            </div>
          </div>
          <div className="support-contact-grid">
            <label className="support-field">
              <span>Email</span>
              <span className="support-input-shell">
                <Icon i="at-sign" size={17} />
                <DemoField
                  name="support.email"
                  label="Email"
                  placeholder="kofi@example.com"
                  multiline={false}
                  type="email"
                  maxLength={254}
                />
              </span>
            </label>
            <label className="support-field">
              <span>
                Téléphone <small>optionnel</small>
              </span>
              <span className="support-input-shell">
                <Icon i="phone" size={17} />
                <DemoField
                  name="support.phone"
                  label="Téléphone"
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
            <strong>Réponse sous 24 heures</strong>
            <span>Tu recevras une réponse sur l’adresse indiquée.</span>
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
          <Icon i="send" size={19} /> {submitting ? "Envoi en cours…" : "Envoyer mon message"}
        </button>
        <button type="button" data-demo-ready className="support-cancel" onClick={() => demo.go("/dashboard/help")}>
          Annuler
        </button>
      </div>
    </div>
  );
}
