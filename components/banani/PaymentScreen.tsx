"use client";

import { useEffect, useState } from "react";

import { useDemo } from "./DemoProvider";
import DemoField from "./DemoField";
import Icon from "./Icon";
import CreationTopNav from "./CreationTopNav";
import MusikSelect from "./MusikSelect";
import { DEMO_PHONE_RULES, demoPaymentSchema, type DemoPhoneCountry } from "@/lib/validation/musikpro-demo";
import { InlineNotice } from "@/components/ui/inline-notice";

export const displayName = "Vos informations";
export const screenSize = "mobile";

const t = (text: string) => text;

const phonePrefixes = [
  { value: "CI", label: "Côte d’Ivoire", display: "🇨🇮 +225" },
  { value: "SN", label: "Sénégal", display: "🇸🇳 +221" },
  { value: "ML", label: "Mali", display: "🇲🇱 +223" },
  { value: "BF", label: "Burkina Faso", display: "🇧🇫 +226" },
  { value: "NE", label: "Niger", display: "🇳🇪 +227" },
  { value: "GH", label: "Ghana", display: "🇬🇭 +233" },
  { value: "NG", label: "Nigeria", display: "🇳🇬 +234" },
  { value: "FR", label: "France", display: "🇫🇷 +33" },
] as const;

export default function PaymentScreen() {
  const demo = useDemo();
  const [fieldErrors, setFieldErrors] = useState<Partial<Record<"name" | "email" | "phone", string>>>({});
  const selectedCountry = (demo.choices.phoneCountry || "CI") as DemoPhoneCountry;
  const phoneRule = DEMO_PHONE_RULES[selectedCountry] ?? DEMO_PHONE_RULES.CI;

  useEffect(() => {
    if (Object.keys(fieldErrors).length === 0) return;
    const timer = window.setTimeout(() => setFieldErrors({}), 4200);
    return () => window.clearTimeout(timer);
  }, [fieldErrors]);

  const clearFieldError = (field: "name" | "email" | "phone") => {
    setFieldErrors((current) => {
      if (!current[field]) return current;
      const next = { ...current };
      delete next[field];
      return next;
    });
  };

  const continueToPacks = () => {
    const parsed = demoPaymentSchema.safeParse({
      name: demo.fields["payment.name"],
      email: demo.fields["payment.email"],
      phone: demo.fields["payment.phone"],
      phoneCountry: selectedCountry,
    });
    if (!parsed.success) {
      const nextErrors: Partial<Record<"name" | "email" | "phone", string>> = {};
      for (const issue of parsed.error.issues) {
        const field = issue.path[0];
        if ((field === "name" || field === "email" || field === "phone") && !nextErrors[field]) {
          nextErrors[field] = issue.message;
        }
      }
      setFieldErrors(nextErrors);
      return;
    }
    setFieldErrors({});
    demo.go("/dashboard/create/pack");
  };

  return (
    <div className="checkout-information-screen bg-surface flex flex-col">
      <CreationTopNav backHref="/dashboard/create/confirm" label="Informations" />

      <div className="checkout-information-content">
        <header className="checkout-information-heading">
          <span className="checkout-information-kicker">
            <Icon i="user-round-check" size={16} />
            Dernière vérification
          </span>
          <h1>{t("Vos informations")}</h1>
          <p>{t("Vérifie tes coordonnées avant de choisir ton offre de crédits.")}</p>
        </header>

        <section className="checkout-information-card" aria-labelledby="checkout-contact-title">
          <div className="checkout-card-heading">
            <span className="checkout-card-icon" aria-hidden="true">
              <Icon i="contact-round" size={21} />
            </span>
            <div>
              <h2 id="checkout-contact-title">{t("Personne concernée")}</h2>
              <p>{t("Ces informations serviront au suivi de ta création.")}</p>
            </div>
          </div>

          <div className="checkout-fields">
            <div className="checkout-field">
              <label htmlFor="demo-payment.name">{t("Nom complet")}</label>
              <span className="checkout-input-shell">
                <Icon i="user" size={19} />
                <DemoField
                  name="payment.name"
                  label="Nom complet"
                  type="text"
                  placeholder="Ex. Ballo Issa"
                  maxLength={100}
                  className="checkout-input"
                  ariaInvalid={Boolean(fieldErrors.name)}
                  describedBy={fieldErrors.name ? "payment-name-error" : undefined}
                  onValueChange={() => clearFieldError("name")}
                />
              </span>
              {fieldErrors.name && (
                <InlineNotice id="payment-name-error" tone="error" className="field-notice">
                  {fieldErrors.name}
                </InlineNotice>
              )}
            </div>

            <div className="checkout-field">
              <label htmlFor="demo-payment.email">{t("Adresse e-mail")}</label>
              <span className="checkout-input-shell">
                <Icon i="mail" size={19} />
                <DemoField
                  name="payment.email"
                  label="Adresse e-mail"
                  type="email"
                  placeholder="nom@exemple.com"
                  maxLength={254}
                  className="checkout-input"
                  ariaInvalid={Boolean(fieldErrors.email)}
                  describedBy={fieldErrors.email ? "payment-email-error" : undefined}
                  onValueChange={() => clearFieldError("email")}
                />
              </span>
              {fieldErrors.email && (
                <InlineNotice id="payment-email-error" tone="error" className="field-notice">
                  {fieldErrors.email}
                </InlineNotice>
              )}
            </div>

            <div className="checkout-field checkout-phone-field">
              <label htmlFor="demo-payment.phone" id="checkout-phone-label">
                {t("Numéro de téléphone")}
              </label>
              <span className="checkout-input-shell checkout-phone-shell">
                <MusikSelect
                  className="checkout-prefix-select"
                  menuClassName="checkout-prefix-menu"
                  ariaLabel="Indicatif téléphonique"
                  portal
                  portalWidth={126}
                  showOptionLabels={false}
                  showSelectionMark={false}
                  value={selectedCountry}
                  onChange={(value) => {
                    const country = value as DemoPhoneCountry;
                    demo.choose("phoneCountry", country);
                    demo.field(
                      "payment.phone",
                      demo.fields["payment.phone"].slice(0, DEMO_PHONE_RULES[country].digits),
                    );
                    clearFieldError("phone");
                  }}
                  options={phonePrefixes}
                />
                <span className="checkout-phone-divider" aria-hidden="true" />
                <DemoField
                  name="payment.phone"
                  label="Numéro de téléphone"
                  type="tel"
                  placeholder={phoneRule.placeholder}
                  maxLength={phoneRule.digits}
                  className="checkout-input checkout-phone-input"
                  ariaInvalid={Boolean(fieldErrors.phone)}
                  describedBy={fieldErrors.phone ? "payment-phone-help payment-phone-error" : "payment-phone-help"}
                  transformValue={(value) => value.replace(/\D/g, "").slice(0, phoneRule.digits)}
                  onValueChange={() => clearFieldError("phone")}
                />
              </span>
              <small id="payment-phone-help">
                {phoneRule.digits} chiffres requis pour cet indicatif, sans espaces.
              </small>
              {fieldErrors.phone && (
                <InlineNotice id="payment-phone-error" tone="error" className="field-notice">
                  {fieldErrors.phone}
                </InlineNotice>
              )}
            </div>
          </div>
        </section>

        <aside className="checkout-privacy-note">
          <span aria-hidden="true">
            <Icon i="shield-check" size={19} />
          </span>
          <div>
            <strong>{t("Tes informations restent protégées")}</strong>
            <p>{t("Elles servent uniquement à préparer la commande et à t’informer du suivi de la chanson.")}</p>
          </div>
        </aside>
      </div>

      <div className="creation-mobile-cta checkout-information-cta">
        <button type="button" data-demo-ready="true" onClick={continueToPacks}>
          {t("Continuer vers les crédits")}
          <Icon i="arrow-right" size={19} />
        </button>
      </div>
    </div>
  );
}
