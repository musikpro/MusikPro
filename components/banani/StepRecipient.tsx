"use client";

import { useEffect, useState } from "react";
import { demoOccasionEmoji } from "@/lib/demo/musikpro-data";
import { demoRecipientSchema } from "@/lib/validation/musikpro-demo";
import CreationTopNav from "./CreationTopNav";
import { useDemo } from "./DemoProvider";
import Icon from "./Icon";
import MusikSelect from "./MusikSelect";
import StepProgressBar from "./StepProgressBar";

export const displayName = "Étape 3 — Destinataire de la chanson";
export const screenSize = "mobile";

const recipientRelations = [
  "Ma femme",
  "Mon mari",
  "Ma copine",
  "Mon copain",
  "Ma mère",
  "Mon père",
  "Mon oncle",
  "Ma tante",
  "Mes enfants",
  "Mon frère",
  "Ma sœur",
  "Un ami",
  "Une amie",
  "Pour moi",
  "Une personne qui compte",
] as const;

function suggestPronunciation(name: string) {
  const vowels = "aeiouyàâäéèêëïîôöùûüÿœ";
  return name
    .trim()
    .split(/\s+/)
    .map((word) => word.replace(new RegExp(`([${vowels}]+)(?=[^${vowels}]+[${vowels}])`, "gi"), "$1-"))
    .join(" ");
}

export default function StepRecipient() {
  const demo = useDemo();
  const [error, setError] = useState("");

  useEffect(() => {
    if (!error) return;
    const timer = window.setTimeout(() => setError(""), 4200);
    return () => window.clearTimeout(timer);
  }, [error]);

  const continueToStyle = () => {
    const parsed = demoRecipientSchema.safeParse({
      name: demo.fields.recipientName,
      pronunciation: demo.fields.recipientPronunciation,
      relation: demo.choices.recipientRelation,
    });
    if (!parsed.success) {
      setError(parsed.error.issues[0].message);
      return;
    }
    setError("");
    demo.field("recipientName", parsed.data.name);
    demo.field("recipientPronunciation", parsed.data.pronunciation);
    demo.choose("recipientRelation", parsed.data.relation);
    demo.go("/dashboard/create/style");
  };

  return (
    <div className="recipient-step bg-surface flex flex-col">
      <CreationTopNav backHref="/dashboard/create/story" current={3} total={8} />

      <div className="px-4 pt-4 pb-2">
        <StepProgressBar current={3} total={8} />
      </div>

      <div className="px-4 pt-3 pb-1">
        <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-primary bg-secondary px-3 py-1.5 rounded-lg">
          {demoOccasionEmoji(demo.choices.occasion)} {demo.choices.occasion}
        </span>
      </div>

      <div className="px-4 pt-4 pb-5">
        <h1 className="font-headings font-bold text-2xl text-foreground mb-1">À qui est destinée la chanson ?</h1>
        <p className="text-sm text-muted-foreground">Aide MusikPro à personnaliser les paroles et la prononciation.</p>
      </div>

      <div className="recipient-form-shell px-4">
        <section className="story-recipient-card recipient-page-card" aria-labelledby="recipient-form-title">
          <div className="story-recipient-heading">
            <span className="story-recipient-heading-icon">
              <Icon i="user-round" size={17} />
            </span>
            <div>
              <h2 id="recipient-form-title">La personne concernée</h2>
              <p>Indique son nom, sa prononciation et votre lien.</p>
            </div>
          </div>

          <div className="story-name-row">
            <label className="story-recipient-field">
              <span>Nom de la personne</span>
              <input
                type="text"
                value={demo.fields.recipientName}
                maxLength={100}
                autoComplete="name"
                placeholder="Ex. Aïcha"
                onChange={(event) => {
                  const name = event.target.value;
                  demo.field("recipientName", name);
                  demo.field("recipientPronunciation", suggestPronunciation(name));
                  setError("");
                }}
              />
            </label>
            <div className="story-recipient-field is-pronunciation">
              <span id="recipient-pronunciation-label">Prononciation suggérée</span>
              <input
                type="text"
                value={demo.fields.recipientPronunciation}
                placeholder="Aï-cha"
                aria-labelledby="recipient-pronunciation-label"
                aria-readonly="true"
                readOnly
                tabIndex={-1}
              />
            </div>
          </div>

          <div className="story-relation-field">
            <span>Lien avec cette personne</span>
            <MusikSelect
              className="story-relation-select"
              icon="heart-handshake"
              ariaLabel="Lien avec cette personne"
              placeholder="Sélectionner une relation"
              value={demo.choices.recipientRelation}
              onChange={(value) => {
                demo.choose("recipientRelation", value);
                setError("");
              }}
              options={recipientRelations.map((relation) => ({ value: relation, label: relation }))}
            />
          </div>

          {error && (
            <p className="story-field-error" role="alert">
              <Icon i="circle-alert" size={15} />
              {error}
            </p>
          )}
        </section>
      </div>

      <section className="recipient-tips mx-4 mt-4 mb-6" aria-labelledby="recipient-tips-title">
        <div className="recipient-tips-title">
          <span>
            <Icon i="lightbulb" size={18} />
          </span>
          <div>
            <h2 id="recipient-tips-title">Pourquoi remplir cette partie ?</h2>
            <p>Ces précisions rendent la chanson plus naturelle et personnelle.</p>
          </div>
        </div>
        <ul>
          <li>
            <Icon i="audio-lines" size={16} />
            <span>
              <strong>Une meilleure prononciation</strong>Le nom est chanté plus clairement, notamment pour les prénoms
              africains.
            </span>
          </li>
          <li>
            <Icon i="heart" size={16} />
            <span>
              <strong>Le bon ton émotionnel</strong>Le lien choisi adapte les mots à votre relation.
            </span>
          </li>
          <li>
            <Icon i="pencil" size={16} />
            <span>
              <strong>Tu gardes le contrôle</strong>La prononciation proposée peut être corrigée avant de continuer.
            </span>
          </li>
        </ul>
      </section>

      <div className="creation-mobile-cta px-4 pb-8">
        <button
          type="button"
          data-demo-ready="true"
          onClick={continueToStyle}
          className="w-full py-4 bg-primary text-primary-foreground font-bold text-base rounded-xl flex items-center justify-center gap-2"
          style={{ boxShadow: "0 4px 16px rgba(242,101,34,0.35)" }}
        >
          Continuer <Icon i="chevron-right" size={18} />
        </button>
      </div>
    </div>
  );
}
