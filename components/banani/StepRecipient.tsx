"use client";

import { useEffect, useRef, useState } from "react";
import { demoRecipientSchema } from "@/lib/validation/musikpro-demo";
import { apiFetch } from "@/lib/api/client";
import CreationTopNav from "./CreationTopNav";
import { useDemo } from "./DemoProvider";
import Icon from "./Icon";
import MusikSelect from "./MusikSelect";
import StepProgressBar from "./StepProgressBar";
import { InlineNotice } from "@/components/ui/inline-notice";
import { translate as t, localizeField } from "@/lib/i18n/translate";

export const displayName = "Étape 3 — Destinataire de la chanson";
export const screenSize = "mobile";

function localPronunciationGuess(name: string) {
  const vowels = "aeiouyàâäéèêëïîôöùûüÿœ";
  return name
    .trim()
    .split(/\s+/)
    .map((word) => word.replace(new RegExp(`([${vowels}]+)(?=[^${vowels}]+[${vowels}])`, "gi"), "$1-"))
    .join(" ");
}

const PRONUNCIATION_DEBOUNCE_MS = 600;

export default function StepRecipient() {
  const demo = useDemo();
  const [fieldErrors, setFieldErrors] = useState<Partial<Record<"name" | "pronunciation" | "relation", string>>>({});
  const [pronunciationLoading, setPronunciationLoading] = useState(false);
  const latestRequestedName = useRef("");

  useEffect(() => {
    if (Object.keys(fieldErrors).length === 0) return;
    const timer = window.setTimeout(() => setFieldErrors({}), 4200);
    return () => window.clearTimeout(timer);
  }, [fieldErrors]);

  useEffect(() => {
    if (demo.isDemo) return;
    const name = demo.fields.recipientName.trim();
    if (!name) return;
    const timer = window.setTimeout(async () => {
      latestRequestedName.current = name;
      setPronunciationLoading(true);
      try {
        const result = await apiFetch<{ pronunciation: string }>("/api/ai/pronunciation", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name, language: demo.choices.language }),
          timeoutMs: 15_000,
        });
        // Ignore a stale response if the user kept typing a different name meanwhile.
        if (latestRequestedName.current === name && result.pronunciation) {
          demo.field("recipientPronunciation", result.pronunciation);
        }
      } catch {
        // Keep the instant local guess already shown — the AI suggestion is a best-effort upgrade.
      } finally {
        if (latestRequestedName.current === name) setPronunciationLoading(false);
      }
    }, PRONUNCIATION_DEBOUNCE_MS);
    return () => window.clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [demo.fields.recipientName, demo.isDemo]);

  const clearFieldError = (field: "name" | "pronunciation" | "relation") => {
    setFieldErrors((current) => {
      if (!current[field]) return current;
      const next = { ...current };
      delete next[field];
      return next;
    });
  };

  const continueToStyle = () => {
    const parsed = demoRecipientSchema.safeParse({
      name: demo.fields.recipientName,
      pronunciation: demo.fields.recipientPronunciation,
      relation: demo.choices.recipientRelation,
    });
    if (!parsed.success) {
      const nextErrors: Partial<Record<"name" | "pronunciation" | "relation", string>> = {};
      for (const issue of parsed.error.issues) {
        const field = issue.path[0];
        if ((field === "name" || field === "pronunciation" || field === "relation") && !nextErrors[field]) {
          nextErrors[field] = issue.message;
        }
      }
      setFieldErrors(nextErrors);
      return;
    }
    setFieldErrors({});
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
          {demo.occasionEmoji(demo.choices.occasion)} {demo.displayName(demo.occasions, demo.choices.occasion)}
        </span>
      </div>

      <div className="px-4 pt-4 pb-5">
        <h1 className="font-headings font-bold text-2xl text-foreground mb-1">{t("À qui est destinée la chanson ?")}</h1>
        <p className="text-sm text-muted-foreground">{t("Aide MusikPro à personnaliser les paroles et la prononciation.")}</p>
      </div>

      <div className="recipient-form-shell px-4">
        <section className="story-recipient-card recipient-page-card" aria-labelledby="recipient-form-title">
          <div className="story-recipient-heading">
            <span className="story-recipient-heading-icon">
              <Icon i="user-round" size={17} />
            </span>
            <div>
              <h2 id="recipient-form-title">{t("La personne concernée")}</h2>
              <p>{t("Indique son nom, sa prononciation et votre lien.")}</p>
            </div>
          </div>

          <div className="story-name-row">
            <div className="story-recipient-field">
              <label htmlFor="recipient-name">{t("Nom de la personne")}</label>
              <input
                id="recipient-name"
                type="text"
                value={demo.fields.recipientName}
                maxLength={100}
                autoComplete="name"
                placeholder={t("Ex. Aïcha")}
                aria-invalid={Boolean(fieldErrors.name)}
                aria-describedby={fieldErrors.name ? "recipient-name-error" : undefined}
                onChange={(event) => {
                  const name = event.target.value;
                  demo.field("recipientName", name);
                  demo.field("recipientPronunciation", localPronunciationGuess(name));
                  clearFieldError("name");
                  clearFieldError("pronunciation");
                }}
              />
              {fieldErrors.name && (
                <InlineNotice id="recipient-name-error" tone="error" className="field-notice">
                  {fieldErrors.name}
                </InlineNotice>
              )}
            </div>
            <div className="story-recipient-field is-pronunciation">
              <span id="recipient-pronunciation-label" style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
                {t("Prononciation suggérée")}
                {pronunciationLoading ? (
                  <Icon i="loader-circle" size={12} className="animate-spin" aria-label={t("Suggestion IA en cours")} />
                ) : null}
              </span>
              <input
                type="text"
                value={demo.fields.recipientPronunciation}
                placeholder="Aï-cha"
                aria-labelledby="recipient-pronunciation-label"
                aria-readonly="true"
                aria-invalid={Boolean(fieldErrors.pronunciation)}
                aria-describedby={fieldErrors.pronunciation ? "recipient-pronunciation-error" : undefined}
                readOnly
                tabIndex={-1}
              />
              {fieldErrors.pronunciation && (
                <InlineNotice id="recipient-pronunciation-error" tone="error" className="field-notice">
                  {fieldErrors.pronunciation}
                </InlineNotice>
              )}
            </div>
          </div>

          <div className="story-relation-field">
            <span>{t("Lien avec cette personne")}</span>
            <MusikSelect
              className="story-relation-select"
              icon="heart-handshake"
              ariaLabel={t("Lien avec cette personne")}
              placeholder={t("Sélectionner une relation")}
              value={demo.choices.recipientRelation}
              ariaInvalid={Boolean(fieldErrors.relation)}
              describedBy={fieldErrors.relation ? "recipient-relation-error" : undefined}
              onChange={(value) => {
                demo.choose("recipientRelation", value);
                clearFieldError("relation");
              }}
              options={demo.recipientRelations.map((relation) => ({
                value: relation.name,
                label: localizeField(relation.name, relation.translations, "name"),
              }))}
            />
            {fieldErrors.relation && (
              <InlineNotice id="recipient-relation-error" tone="error" className="field-notice">
                {fieldErrors.relation}
              </InlineNotice>
            )}
          </div>
        </section>
      </div>

      <section className="recipient-tips mx-4 mt-4 mb-6" aria-labelledby="recipient-tips-title">
        <div className="recipient-tips-title">
          <span>
            <Icon i="lightbulb" size={18} />
          </span>
          <div>
            <h2 id="recipient-tips-title">{t("Pourquoi remplir cette partie ?")}</h2>
            <p>{t("Ces précisions rendent la chanson plus naturelle et personnelle.")}</p>
          </div>
        </div>
        <ul>
          <li>
            <Icon i="audio-lines" size={16} />
            <span>
              <strong>{t("Une meilleure prononciation")}</strong>
              {t("Le nom est chanté plus clairement, notamment pour les prénoms africains.")}
            </span>
          </li>
          <li>
            <Icon i="heart" size={16} />
            <span>
              <strong>{t("Le bon ton émotionnel")}</strong>
              {t("Le lien choisi adapte les mots à votre relation.")}
            </span>
          </li>
          <li>
            <Icon i="pencil" size={16} />
            <span>
              <strong>{t("Tu gardes le contrôle")}</strong>
              {t("La prononciation proposée peut être corrigée avant de continuer.")}
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
          {t("Continuer")} <Icon i="chevron-right" size={18} />
        </button>
      </div>
    </div>
  );
}
