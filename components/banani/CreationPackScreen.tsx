"use client";

import Image from "next/image";
import { demoCurrencies, formatDemoPackPrice } from "@/lib/demo/musikpro-data";
import CreationTopNav from "./CreationTopNav";
import Icon from "./Icon";
import MusikSelect from "./MusikSelect";
import { useDemo } from "./DemoProvider";

export const displayName = "Choix du pack de chansons";
export const screenSize = "mobile";

const t = (text: string) => text;

export default function CreationPackScreen() {
  const demo = useDemo();

  return (
    <div className="creation-pack-screen bg-surface flex flex-col">
      <CreationTopNav backHref="/dashboard/payment-preview" label="Choix du pack" />

      <div className="creation-pack-content">
        <header className="creation-pack-heading">
          <div>
            <span className="creation-pack-kicker">
              <Icon i="music-2" size={16} />
              Une chanson, deux versions
            </span>
            <h1>{t("Choisis ton pack")}</h1>
            <p>{t("Sélectionne le nombre de chansons que tu souhaites créer.")}</p>
          </div>
          <MusikSelect
            className="pack-currency-select"
            icon="coins"
            ariaLabel="Devise"
            showOptionDisplays={false}
            showSelectionMark={false}
            value={demo.choices.currency}
            onChange={(value) => demo.choose("currency", value)}
            options={demoCurrencies.map((currency) => ({
              value: currency.code,
              label: currency.label,
              display: currency.symbol,
            }))}
          />
        </header>

        <section className="checkout-information-card creation-pack-panel" aria-labelledby="creation-pack-panel-title">
          <div className="checkout-card-heading">
            <span className="checkout-card-icon" aria-hidden="true">
              <Icon i="package-open" size={21} />
            </span>
            <div>
              <h2 id="creation-pack-panel-title">{t("Packs disponibles")}</h2>
              <p>{t("Choisis le pack adapté au nombre de chansons que tu veux créer.")}</p>
            </div>
          </div>

          <div className="creation-pack-list" role="radiogroup" aria-label="Packs de chansons disponibles">
            {demo.songPacks.length === 0 && (
              <div className="creation-pack-card is-empty">
                <span className="creation-pack-card-main">
                  <strong>{t("Aucun pack disponible")}</strong>
                  <small>{t("Les packs réels publiés apparaîtront ici.")}</small>
                </span>
              </div>
            )}
            {demo.songPacks.map((pack) => {
              const selected = demo.pack?.id === pack.id;
              return (
                <button
                  type="button"
                  role="radio"
                  aria-checked={selected}
                  data-demo-ready="true"
                  key={pack.id}
                  onClick={() => demo.setPackIndex(demo.songPacks.findIndex((item) => item.id === pack.id))}
                  className={`creation-pack-card${selected ? " is-selected" : ""}`}
                >
                  <span className="creation-pack-card-main">
                    <span className="creation-pack-card-title">
                      <strong>{pack.name}</strong>
                      {pack.popular && <em>{t("Populaire")}</em>}
                    </span>
                    <small>{pack.description}</small>
                    {pack.bonus && (
                      <span className="creation-pack-bonus">
                        <Icon i="gift" size={13} />
                        {pack.bonus}
                      </span>
                    )}
                  </span>
                  <span className="creation-pack-card-value">
                    <strong>{pack.songs ?? "∞"}</strong>
                    <small>{pack.songs === 1 ? "chanson" : "chansons"}</small>
                    <b>{formatDemoPackPrice(pack.priceValue, demo.choices.currency)}</b>
                  </span>
                  <span className="creation-pack-radio" aria-hidden="true">
                    {selected && <Icon i="check" size={15} />}
                  </span>
                </button>
              );
            })}
          </div>

          <div className="creation-pack-payment-methods" aria-label="Moyens de paiement acceptés">
            <p>{t("Moyens de paiement acceptés")}</p>
            <div className="pack-payment-logos">
              <span className="payment-logo payment-logo-orange-money">
                <Image src="/banani/payment-logos/orange-money.png" alt="Orange Money" width={132} height={36} />
              </span>
              <span className="payment-logo payment-logo-mtn-momo">
                <Image src="/banani/payment-logos/mtn-momo.png" alt="MTN MoMo" width={96} height={45} />
              </span>
              <span className="payment-logo payment-logo-moov-money">
                <Image src="/banani/payment-logos/moov-money.png" alt="Moov Money" width={54} height={54} />
              </span>
              <span className="payment-logo payment-logo-wave-money">
                <Image src="/banani/payment-logos/wave.png" alt="Wave" width={96} height={42} />
              </span>
              <span className="payment-logo payment-logo-card">
                <Image src="/banani/payment-logos/visa.svg" alt="Visa" width={44} height={15} />
                <Image src="/banani/payment-logos/mastercard.svg" alt="Mastercard" width={31} height={24} />
              </span>
            </div>
          </div>
        </section>
      </div>

      <div className="creation-mobile-cta creation-pack-cta">
        <div className="creation-pack-total">
          <span>{demo.pack?.name ?? t("Aucun pack sélectionné")}</span>
          <strong>{demo.pack ? formatDemoPackPrice(demo.pack.priceValue, demo.choices.currency) : "—"}</strong>
        </div>
        <button
          type="button"
          data-demo-ready="true"
          disabled={!demo.pack}
          onClick={() => demo.pack && demo.go("/dashboard/payment-preview/chariow")}
        >
          {t("Aller au paiement")}
          <Icon i="arrow-right" size={19} />
        </button>
      </div>
    </div>
  );
}
