"use client";

import { useEffect, useRef, useState } from "react";
import { demoRecipientSchema, demoSenderSchema } from "@/lib/validation/musikpro-demo";
import { apiFetch } from "@/lib/api/client";
import CreationTopNav from "./CreationTopNav";
import { useDemo } from "./DemoProvider";
import Icon from "./Icon";
import MusikSelect from "./MusikSelect";
import StepProgressBar from "./StepProgressBar";
import { InlineNotice } from "@/components/ui/inline-notice";
import { translate as t, localizeField } from "@/lib/i18n/translate";
import OccasionFieldsSection from "./OccasionFieldsSection";
import { validateOccasionAnswers, buildOccasionDetails, type AnswerErrorCode } from "@/lib/occasion-fields/answers";
import { clearHiddenBlockValues } from "@/lib/occasion-fields/client";

export const displayName = "Étape 3 — Personnalisation de la chanson";
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

type RecipientField = "name" | "pronunciation" | "relation";
type SenderField = "senderName" | "senderPronunciation";

export default function StepRecipient() {
  const demo = useDemo();
  const [fieldErrors, setFieldErrors] = useState<Partial<Record<RecipientField | SenderField, string>>>({});
  const [detailErrors, setDetailErrors] = useState<Record<string, AnswerErrorCode>>({});
  const [pronunciationLoading, setPronunciationLoading] = useState(false);
  const [senderPronunciationLoading, setSenderPronunciationLoading] = useState(false);
  const latestRequestedName = useRef("");
  const latestRequestedSenderName = useRef("");

  useEffect(() => {
    if (Object.keys(fieldErrors).length === 0 && Object.keys(detailErrors).length === 0) return;
    const timer = window.setTimeout(() => {
      setFieldErrors({});
      setDetailErrors({});
    }, 4200);
    return () => window.clearTimeout(timer);
  }, [fieldErrors, detailErrors]);

  const showRecipientBlock = demo.occasionBlocks.showRecipient;
  const showSenderBlock = demo.occasionBlocks.showSender;
  const showRecipientRef = useRef(showRecipientBlock);
  const showSenderRef = useRef(showSenderBlock);
  useEffect(() => {
    showRecipientRef.current = showRecipientBlock;
    showSenderRef.current = showSenderBlock;
  }, [showRecipientBlock, showSenderBlock]);

  useEffect(() => {
    if (demo.isDemo || !showRecipientBlock) return;
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
        if (latestRequestedName.current === name && result.pronunciation && showRecipientRef.current) {
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
  }, [demo.fields.recipientName, demo.isDemo, showRecipientBlock]);

  useEffect(() => {
    if (demo.isDemo || !showSenderBlock) return;
    const name = demo.fields.senderName.trim();
    if (!name) return;
    const timer = window.setTimeout(async () => {
      latestRequestedSenderName.current = name;
      setSenderPronunciationLoading(true);
      try {
        const result = await apiFetch<{ pronunciation: string }>("/api/ai/pronunciation", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name, language: demo.choices.language }),
          timeoutMs: 15_000,
        });
        // Ignore a stale response if the user kept typing a different name meanwhile.
        if (latestRequestedSenderName.current === name && result.pronunciation && showSenderRef.current) {
          demo.field("senderPronunciation", result.pronunciation);
        }
      } catch {
        // Keep the instant local guess already shown — the AI suggestion is a best-effort upgrade.
      } finally {
        if (latestRequestedSenderName.current === name) setSenderPronunciationLoading(false);
      }
    }, PRONUNCIATION_DEBOUNCE_MS);
    return () => window.clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [demo.fields.senderName, demo.isDemo, showSenderBlock]);

  const clearFieldError = (field: RecipientField | SenderField) => {
    setFieldErrors((current) => {
      if (!current[field]) return current;
      const next = { ...current };
      delete next[field];
      return next;
    });
  };

  const continueToStyle = () => {
    const { showRecipient, showSender } = demo.occasionBlocks;
    const parsedRecipient = showRecipient
      ? demoRecipientSchema.safeParse({
          name: demo.fields.recipientName,
          pronunciation: demo.fields.recipientPronunciation,
          relation: demo.choices.recipientRelation,
        })
      : null;
    const parsedSender = showSender
      ? demoSenderSchema.safeParse({
          name: demo.fields.senderName,
          pronunciation: demo.fields.senderPronunciation,
        })
      : null;
    const details = validateOccasionAnswers(
      demo.occasionFields,
      buildOccasionDetails(demo.occasionFields, demo.details),
    );
    const recipientFailed = parsedRecipient !== null && !parsedRecipient.success;
    const senderFailed = parsedSender !== null && !parsedSender.success;
    if (recipientFailed || senderFailed || !details.ok) {
      const nextErrors: Partial<Record<RecipientField | SenderField, string>> = {};
      for (const issue of recipientFailed ? parsedRecipient.error.issues : []) {
        const field = issue.path[0];
        if ((field === "name" || field === "pronunciation" || field === "relation") && !nextErrors[field]) {
          nextErrors[field] = issue.message;
        }
      }
      for (const issue of senderFailed ? parsedSender.error.issues : []) {
        const field = issue.path[0] === "name" ? "senderName" : issue.path[0] === "pronunciation" ? "senderPronunciation" : undefined;
        if (field && !nextErrors[field]) nextErrors[field] = issue.message;
      }
      setFieldErrors(nextErrors);
      setDetailErrors(details.ok ? {} : details.errors);
      return;
    }
    setFieldErrors({});
    setDetailErrors({});
    // Un bloc masqué ne doit rien envoyer à la génération, même avec une saisie héritée d'une autre occasion.
    const cleared = clearHiddenBlockValues(demo.occasionBlocks, { fields: demo.fields, choices: demo.choices });
    if (!showRecipient) {
      demo.field("recipientName", cleared.fields.recipientName);
      demo.field("recipientPronunciation", cleared.fields.recipientPronunciation);
      demo.choose("recipientRelation", cleared.choices.recipientRelation);
    } else if (parsedRecipient?.success) {
      demo.field("recipientName", parsedRecipient.data.name);
      demo.field("recipientPronunciation", parsedRecipient.data.pronunciation);
      demo.choose("recipientRelation", parsedRecipient.data.relation);
    }
    if (!showSender) {
      demo.field("senderName", cleared.fields.senderName);
      demo.field("senderPronunciation", cleared.fields.senderPronunciation);
    } else if (parsedSender?.success) {
      demo.field("senderName", parsedSender.data.name);
      demo.field("senderPronunciation", parsedSender.data.pronunciation);
    }
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
        <h1 className="font-headings font-bold text-2xl text-foreground mb-1">
          {t("Personnalise ta chanson")}
        </h1>
        <p className="text-sm text-muted-foreground">
          {t("Quelques détails pour que ce soit vraiment la tienne")}
        </p>
      </div>

      <div className="recipient-form-shell px-4">
        {demo.occasionBlocks.showRecipient ? (
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
                placeholder={t("Aï-cha")}
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
              portal
              menuClassName="story-relation-menu"
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
        ) : null}

        {demo.occasionBlocks.showSender ? (
        <section className="story-recipient-card recipient-page-card" aria-labelledby="sender-form-title">
          <div className="story-recipient-heading">
            <span className="story-recipient-heading-icon">
              <Icon i="user-round-pen" size={17} />
            </span>
            <div>
              <h2 id="sender-form-title">{t("De la part de qui")}</h2>
              <p>{t("Indique ton nom et sa prononciation.")}</p>
            </div>
          </div>

          <div className="story-name-row">
            <div className="story-recipient-field">
              <label htmlFor="sender-name">{t("Votre nom")}</label>
              <input
                id="sender-name"
                type="text"
                value={demo.fields.senderName}
                maxLength={100}
                autoComplete="name"
                placeholder={t("Ex. Moussa")}
                aria-invalid={Boolean(fieldErrors.senderName)}
                aria-describedby={fieldErrors.senderName ? "sender-name-error" : undefined}
                onChange={(event) => {
                  const name = event.target.value;
                  demo.field("senderName", name);
                  demo.field("senderPronunciation", localPronunciationGuess(name));
                  clearFieldError("senderName");
                  clearFieldError("senderPronunciation");
                }}
              />
              {fieldErrors.senderName && (
                <InlineNotice id="sender-name-error" tone="error" className="field-notice">
                  {fieldErrors.senderName}
                </InlineNotice>
              )}
            </div>
            <div className="story-recipient-field is-pronunciation">
              <span id="sender-pronunciation-label" style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
                {t("Prononciation suggérée")}
                {senderPronunciationLoading ? (
                  <Icon i="loader-circle" size={12} className="animate-spin" aria-label={t("Suggestion IA en cours")} />
                ) : null}
              </span>
              <input
                type="text"
                value={demo.fields.senderPronunciation}
                placeholder={t("Mou-ssa")}
                aria-labelledby="sender-pronunciation-label"
                aria-readonly="true"
                aria-invalid={Boolean(fieldErrors.senderPronunciation)}
                aria-describedby={fieldErrors.senderPronunciation ? "sender-pronunciation-error" : undefined}
                readOnly
                tabIndex={-1}
              />
              {fieldErrors.senderPronunciation && (
                <InlineNotice id="sender-pronunciation-error" tone="error" className="field-notice">
                  {fieldErrors.senderPronunciation}
                </InlineNotice>
              )}
            </div>
          </div>
        </section>
        ) : null}
        <OccasionFieldsSection
          errors={detailErrors}
          onChange={(fieldId) =>
            setDetailErrors((current) => {
              if (!current[fieldId]) return current;
              const next = { ...current };
              delete next[fieldId];
              return next;
            })
          }
        />
      </div>

      {demo.occasionBlocks.showRecipient || demo.occasionBlocks.showSender ? (
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
      ) : null}

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
