import { LANDING_LANGUAGE_COOKIE } from "@/lib/languages/landing-language-cookie";
import { pickPageLocale, readCookieValue } from "@/lib/i18n/page-locale";
import { translateForLocale, type Locale } from "@/lib/i18n/translate";

export type AuthEmailKind = "reset" | "verify";

export type AuthEmailText = {
  subject: string;
  title: string;
  actionLabel: string;
  /** Contient `{brand}` : à substituer à l'envoi (jamais avant la traduction). */
  intro: string;
  ignore: string;
};

/** Textes de l'e-mail d'authentification d'un client, dans la langue demandée (fr = texte source). */
export function authEmailText(kind: AuthEmailKind, locale: Locale): AuthEmailText {
  const t = (text: string) => translateForLocale(text, locale);
  const intro = t("Cette demande concerne votre compte {brand}.");
  const ignore = t("Si vous n'êtes pas à l'origine de cette demande, ignorez cet e-mail.");
  if (kind === "reset") {
    return {
      subject: t("Réinitialiser votre mot de passe"),
      title: t("Réinitialisation du mot de passe"),
      actionLabel: t("Choisir un nouveau mot de passe"),
      intro,
      ignore,
    };
  }
  return {
    subject: t("Vérifiez votre adresse e-mail"),
    title: t("Confirmez votre adresse e-mail"),
    actionLabel: t("Vérifier mon e-mail"),
    intro,
    ignore,
  };
}

/** Langue de la requête du client : cookie `musikpro_lang`, puis Accept-Language, puis fr (sans requête : fr). */
export function localeFromRequest(request: Request | undefined): Locale {
  if (!request) return "fr";
  return pickPageLocale({
    cookie: readCookieValue(request.headers.get("cookie"), LANDING_LANGUAGE_COOKIE),
    acceptLanguage: request.headers.get("accept-language"),
  });
}
