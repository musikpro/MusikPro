"use client";
import Icon from "@/components/banani/Icon";
import AdminActionForm from "@/components/admin/AdminActionForm";
import AdminSelect from "@/components/admin/AdminSelect";
import { setHeroAnimationSettings } from "@/app/admin/animated-texts/actions";
import {
  HERO_ANIMATION_TYPES,
  HERO_ANIMATION_TYPE_LABELS,
  HERO_TEXT_SIZES,
  HERO_TEXT_SIZE_LABELS,
  type HeroAnimationType,
  type HeroTextSize,
} from "@/lib/hero-animation/types";

export default function HeroAnimationSettingsPanel({
  animationType,
  textSize,
}: {
  animationType: HeroAnimationType;
  textSize: HeroTextSize;
}) {
  return (
    <section className="admin-panel">
      <div className="admin-provider-heading">
        <span className="admin-catalog-icon">
          <Icon i="type" size={20} />
        </span>
        <div>
          <h2>Animation des textes défilants</h2>
          <p>Choisis comment et à quelle taille les textes défilent sous le titre de la landing publique.</p>
        </div>
      </div>
      <AdminActionForm action={setHeroAnimationSettings} className="admin-editor-grid">
        <div className="admin-editor-field">
          <span>Type d’animation</span>
          <AdminSelect
            name="animationType"
            defaultValue={animationType}
            ariaLabel="Type d’animation du Hero"
            options={HERO_ANIMATION_TYPES.map((type) => ({ value: type, label: HERO_ANIMATION_TYPE_LABELS[type] }))}
          />
        </div>
        <div className="admin-editor-field">
          <span>Taille du texte</span>
          <AdminSelect
            name="textSize"
            defaultValue={textSize}
            ariaLabel="Taille du texte animé du Hero"
            options={HERO_TEXT_SIZES.map((size) => ({ value: size, label: HERO_TEXT_SIZE_LABELS[size] }))}
          />
        </div>
        <div className="admin-editor-actions is-wide">
          <button type="submit">
            <Icon i="save" size={17} /> Enregistrer
          </button>
        </div>
      </AdminActionForm>
    </section>
  );
}
