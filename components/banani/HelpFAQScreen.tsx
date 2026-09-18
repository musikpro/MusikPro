"use client";
const t = (text: string) => text;
import { useDemo } from "./DemoProvider";

export const displayName = "Aide & FAQ";
export const screenSize = "mobile";

import Icon from "./Icon";

const faqs = [
  {
    question: "Comment créer une chanson ?",
    answer:
      "Pour créer une chanson, cliquez sur le bouton \"Créer\" depuis l'écran d'accueil. Suivez les étapes pour sélectionner votre style musical et votre occasion spéciale, puis notre IA générera une chanson unique pour vous.",
  },
  {
    question: "Combien de chansons puis-je créer ?",
    answer:
      "Le nombre de chansons dépend de votre plan d'abonnement. Le plan Populaire vous permet de créer 5 chansons par mois.",
  },
  {
    question: "Puis-je télécharger mes chansons ?",
    answer:
      'Oui, vous pouvez télécharger vos chansons générées au format MP3 directement depuis votre bibliothèque "Mes chansons".',
  },
  {
    question: "Comment fonctionne le système de crédit ?",
    answer:
      "Chaque création de chanson consomme un crédit. Vous obtenez des crédits avec votre abonnement et vous pouvez en acheter des supplémentaires selon vos besoins.",
  },
  {
    question: "Puis-je partager mes chansons ?",
    answer:
      "Absolument ! Vous pouvez partager vos chansons sur les réseaux sociaux ou avec vos amis via un lien direct depuis la page de chaque chanson.",
  },
  {
    question: "Que faire si j'ai un problème technique ?",
    answer:
      'Si vous rencontrez un problème, veuillez contacter notre équipe de support via le formulaire "Contacter le support" dans les paramètres de votre profil.',
  },
];

export default function HelpFAQScreen() {
  const demo = useDemo();
  return (
    <div className="bg-background flex flex-col">
      {/* Top Nav */}
      <div className="bg-background border-b border-border px-4 py-3 flex items-center justify-between">
        <button
          type="button"
          data-demo-ready="true"
          onClick={() => demo.go("/dashboard/menu")}
          className="flex items-center gap-1.5 text-sm font-semibold text-foreground"
        >
          <Icon i="arrow-left" size={18} /> {t("Retour")}
        </button>
        <h1 className="text-sm font-medium text-muted-foreground">
          {t("Aide & FAQ")}
        </h1>
      </div>

      {/* Content */}
      <div className="workspace-help-content flex-1 px-4 py-6 overflow-y-auto space-y-4">
        {/* Header */}
        <div className="mb-6">
          <h2 className="font-headings font-bold text-xl text-foreground mb-2">
            {t("Questions fréquemment posées")}
          </h2>
          <p className="text-sm text-muted-foreground">
            {t("Trouvez les réponses à vos questions sur Musika.")}
          </p>
        </div>

        {/* FAQs */}
        <div className="space-y-3 pb-6">
          {faqs.map((faq, index) => (
            <details key={index} className="group">
              <summary className="bg-card border border-border rounded-xl px-4 py-3 flex items-center justify-between cursor-pointer list-none">
                <span className="text-sm font-medium text-foreground pr-2">
                  {faq.question}
                </span>
                <Icon
                  i="chevron-down"
                  size={18}
                  className="text-muted-foreground group-open:rotate-180 transition-transform"
                />
              </summary>
              <div className="bg-input border border-border border-t-0 rounded-b-xl px-4 py-3 mt-0">
                <p className="text-sm text-muted-foreground">{faq.answer}</p>
              </div>
            </details>
          ))}
        </div>

        {/* Contact Support */}
        <div className="bg-secondary/40 border border-secondary rounded-xl p-4 mt-6">
          <div className="flex items-start gap-3 mb-3">
            <Icon
              i="mail"
              size={20}
              className="text-primary flex-shrink-0 mt-0.5"
            />
            <div>
              <h3 className="font-bold text-sm text-foreground">
                {t("Vous n'avez pas trouvé votre réponse ?")}
              </h3>
              <p className="text-xs text-muted-foreground mt-1">
                {t(
                  "Contactez notre équipe de support, nous sommes là pour vous aider.",
                )}
              </p>
            </div>
          </div>
          <button
            type="button"
            data-demo-ready="true"
            onClick={() => demo.go("/dashboard/support")}
            className="w-full py-2.5 bg-primary text-primary-foreground font-semibold text-sm rounded-lg"
          >
            {t("Contacter le support")}
          </button>
        </div>
      </div>
    </div>
  );
}
