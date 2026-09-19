"use client";

import { useDemo } from "./DemoProvider";
import DemoField from "./DemoField";
import Icon from "./Icon";
import CreationTopNav from "./CreationTopNav";
import MusikSelect from "./MusikSelect";
import { demoPaymentSchema } from "@/lib/validation/musikpro-demo";

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

  const continueToPacks = () => {
    const parsed = demoPaymentSchema.safeParse({
      name: demo.fields["payment.name"],
      email: demo.fields["payment.email"],
      phone: demo.fields["payment.phone"],
    });
    if (!parsed.success) {
      demo.notify("Vérifie tes informations et saisis les 10 chiffres de ton téléphone.");
      return;
    }
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
          <p>{t("Vérifie tes coordonnées avant de choisir ton pack de chansons.")}</p>
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
            <label className="checkout-field">
              <span>{t("Nom complet")}</span>
              <span className="checkout-input-shell">
                <Icon i="user" size={19} />
                <DemoField
                  name="payment.name"
                  label="Nom complet"
                  type="text"
                  placeholder="Ex. Ballo Issa"
                  maxLength={100}
                  className="checkout-input"
                />
              </span>
            </label>

            <label className="checkout-field">
              <span>{t("Adresse e-mail")}</span>
              <span className="checkout-input-shell">
                <Icon i="mail" size={19} />
                <DemoField
                  name="payment.email"
                  label="Adresse e-mail"
                  type="email"
                  placeholder="nom@exemple.com"
                  maxLength={254}
                  className="checkout-input"
                />
              </span>
            </label>

            <div className="checkout-field checkout-phone-field">
              <span id="checkout-phone-label">{t("Numéro de téléphone")}</span>
              <span className="checkout-input-shell checkout-phone-shell">
                <MusikSelect
                  className="checkout-prefix-select"
                  menuClassName="checkout-prefix-menu"
                  ariaLabel="Indicatif téléphonique"
                  portal
                  portalWidth={126}
                  showOptionLabels={false}
                  showSelectionMark={false}
                  value={demo.choices.phoneCountry ?? "CI"}
                  onChange={(value) => demo.choose("phoneCountry", value)}
                  options={phonePrefixes}
                />
                <span className="checkout-phone-divider" aria-hidden="true" />
                <DemoField
                  name="payment.phone"
                  label="Numéro de téléphone"
                  type="tel"
                  placeholder="0708807015"
                  maxLength={10}
                  className="checkout-input checkout-phone-input"
                />
              </span>
              <small>{t("10 chiffres requis, sans espaces.")}</small>
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
          {t("Continuer vers les packs")}
          <Icon i="arrow-right" size={19} />
        </button>
      </div>
    </div>
  );
}
