"use client";
const t = (text: string) => text;
import { useDemo } from "./DemoProvider";

import DemoField from "./DemoField";
import { demoProfileSchema } from "@/lib/validation/musikpro-demo";

export const displayName = "Éditer le profil";
export const screenSize = "mobile";

import Icon from "./Icon";

export default function EditProfileScreen() {
  const demo = useDemo();
  return (
    <div className="bg-background flex flex-col">
      {/* Top Nav */}
      <div className="bg-background border-b border-border px-4 py-3 flex items-center justify-between">
        <button
          type="button"
          data-demo-ready="true"
          onClick={() => demo.go("/dashboard/profile")}
          className="flex items-center gap-1.5 text-sm font-semibold text-foreground"
        >
          <Icon i="arrow-left" size={18} /> {t("Retour")}
        </button>
        <h1 className="text-sm font-medium text-muted-foreground">
          {t("Éditer profil")}
        </h1>
      </div>

      {/* Content */}
      <div className="flex-1 px-4 py-6 overflow-y-auto space-y-5">
        {/* Name */}
        <div>
          <label className="text-xs font-bold text-muted-foreground uppercase">
            {t("Nom complet")}
          </label>
          <div className="border border-border rounded-lg px-3 py-3 mt-2 bg-input">
            <DemoField
              name="profile.name"
              label="Nom complet"
              type="text"
              maxLength={254}
            />
          </div>
        </div>

        {/* Email */}
        <div>
          <label className="text-xs font-bold text-muted-foreground uppercase">
            {t("Email")}
          </label>
          <div className="border border-border rounded-lg px-3 py-3 mt-2 bg-input">
            <DemoField
              name="profile.email"
              label="Email"
              type="email"
              maxLength={254}
            />
          </div>
        </div>

        {/* Location */}
        <div>
          <label className="text-xs font-bold text-muted-foreground uppercase">
            {t("Localisation")}
          </label>
          <div className="border border-border rounded-lg px-3 py-3 mt-2 bg-input">
            <DemoField
              name="profile.location"
              label="Localisation"
              type="text"
              maxLength={254}
            />
          </div>
        </div>
      </div>

      {/* CTA */}
      <div className="px-4 py-4 bg-background space-y-2">
        <button
          type="button"
          data-demo-ready="true"
          onClick={() =>
            (() => {
              const parsed = demoProfileSchema.safeParse({
                name: demo.fields["profile.name"],
                email: demo.fields["profile.email"],
                location: demo.fields["profile.location"],
              });
              if (!parsed.success) {
                demo.notify("Vérifie ton nom, ton email et ta localisation.");
                return;
              }
              demo.setProfile(parsed.data);
              demo.go("/dashboard/profile");
            })()
          }
          className="w-full py-4 bg-primary text-primary-foreground font-bold text-base rounded-xl"
          style={{ boxShadow: "0 4px 16px rgba(242,101,34,0.35)" }}
        >
          {t("Enregistrer les modifications")}
        </button>
        <button
          type="button"
          data-demo-ready="true"
          onClick={() => demo.go("/dashboard/profile")}
          className="w-full py-3 bg-secondary text-primary font-semibold text-base rounded-xl border border-primary/30"
        >
          {t("Annuler")}
        </button>
      </div>
    </div>
  );
}
