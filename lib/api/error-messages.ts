import { i18nKey } from "@/lib/i18n/key";
import { translate as t, translateTemplate } from "@/lib/i18n/translate";

/** Messages français renvoyés par les routes d'API et affichés au client (clés de traduction). */
export const API_ERROR_MESSAGES = [
  // Transverses
  i18nKey("Authentification requise."),
  i18nKey("Le contrôle de débit est indisponible."),
  i18nKey("Trop de requêtes. Réessaie dans un instant."),
  i18nKey("Identifiant invalide."),
  i18nKey("Paramètres invalides."),
  i18nKey("Requête invalide."),
  i18nKey("Service temporairement indisponible"),
  // Chansons
  i18nKey("Chanson introuvable."),
  i18nKey("Version introuvable."),
  i18nKey("Cette chanson n'est pas encore prête à être publiée."),
  i18nKey("Cette image n'est pas hébergée sur un domaine autorisé."),
  i18nKey("Cette chanson a été retirée de Découvrir par l’équipe MusikPro."),
  // Génération musicale
  i18nKey("La génération audio n’est pas encore configurée."),
  i18nKey("Trop de générations audio. Réessaie plus tard."),
  i18nKey("Paramètres de génération invalides."),
  i18nKey("La génération instrumentale est désactivée."),
  i18nKey("La génération à partir de paroles est désactivée."),
  i18nKey("La génération à partir d’un style/texte est désactivée."),
  i18nKey("Ajoute un style, une invite ou des paroles pour générer une chanson."),
  i18nKey("Le fournisseur audio actif n’est pas encore intégré."),
  i18nKey("La génération de chansons est désactivée."),
  i18nKey("Trop de générations. Réessaie plus tard."),
  i18nKey("La génération n’a pas pu démarrer. Tes crédits ont été recrédités."),
  i18nKey("Génération introuvable."),
  i18nKey("Impossible de récupérer l’état de la génération."),
  i18nKey("La conversion WAV est désactivée."),
  i18nKey("La chanson doit d’abord être générée avec succès."),
  // Paroles et prononciation
  i18nKey("Paramètres de paroles invalides."),
  i18nKey("Le fournisseur de paroles n’est pas encore configuré."),
  i18nKey("Cette fonction de paroles est désactivée."),
  i18nKey("Le résultat généré n’a pas pu être validé. Réessaie avec une description différente."),
  i18nKey("La suggestion de prononciation n’est pas encore configurée."),
  // Occasions (cause d'une réponse invalide)
  i18nKey("réponse invalide"),
  i18nKey("Ce champ est obligatoire."),
  i18nKey("Choisis une option proposée."),
  i18nKey("Entre un nombre entier valide."),
  i18nKey("La valeur est hors des limites autorisées."),
  i18nKey("Entre une date valide."),
  i18nKey("Le texte est trop long."),
  i18nKey("Un champ ne correspond plus à cette occasion. Recharge la page."),
  i18nKey("Une réponse est en double."),
  // Envoi d'images
  i18nKey("L'envoi d'image n'est pas disponible pour le moment."),
  i18nKey("Impossible de lire le fichier envoyé."),
  i18nKey("Un fichier image est requis."),
  i18nKey("L'envoi de l'image a échoué."),
  // Support
  i18nKey("Le service de support est temporairement indisponible."),
  i18nKey("Trop de messages envoyés. Réessaie plus tard."),
  i18nKey("Vérifie les informations du formulaire."),
  i18nKey("Le message n’a pas pu être envoyé. Réessaie dans un instant."),
  // Paiement et coupons
  i18nKey("Ce code n’existe pas ou n’est plus actif."),
  i18nKey("Ce code a expiré."),
  i18nKey("Ce code a atteint sa limite d’utilisation."),
  i18nKey("Offre indisponible."),
  i18nKey("L’adresse de l’application n’est pas configurée."),
  i18nKey("Les adresses de redirection doivent appartenir à l’application."),
  i18nKey("Aucun moyen de paiement compatible n’est disponible pour le moment."),
  i18nKey("Le prestataire de paiement a refusé la transaction."),
  i18nKey("Le numéro de téléphone n’est pas valide pour ce pays. Vérifie-le et réessaie."),
  i18nKey(
    "La réponse du prestataire de paiement est incertaine : le paiement n’a pas été relancé automatiquement pour éviter un doublon.",
  ),
  i18nKey("Tous les prestataires de paiement compatibles ont refusé la transaction."),
] as const;

/** Messages avec valeur : reconnus par motif (ancré, jamais plus large que le message exact), puis reconstruits avec translateTemplate (littéral). */
export function translateApiMessage(message: string): string {
  const credits = /^Il faut (\d+) crédits pour lancer une génération musicale\.$/.exec(message);
  if (credits) {
    return translateTemplate("Il faut {credits} crédits pour lancer une génération musicale.", { credits: credits[1] });
  }
  const usages = /^Cette chanson est déjà utilisée et ne peut pas être supprimée : (.+)\.$/s.exec(message);
  if (usages) {
    return translateTemplate("Cette chanson est déjà utilisée et ne peut pas être supprimée : {usages}.", {
      usages: usages[1],
    });
  }
  const details =
    /^Certaines informations personnalisées sont invalides \((.+)\)\. Vérifie l’étape « Personnalise ta chanson »\.$/s.exec(
      message,
    );
  if (details) {
    return translateTemplate(
      "Certaines informations personnalisées sont invalides ({cause}). Vérifie l’étape « Personnalise ta chanson ».",
      { cause: t(details[1]) },
    );
  }
  return t(message);
}
