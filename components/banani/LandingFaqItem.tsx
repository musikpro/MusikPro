import Icon from "./Icon";

/**
 * Carte de question pliable. Élément <details> natif : fermé par défaut, accessible au clavier
 * et aux lecteurs d'écran, sans JavaScript côté client. Le style vit dans banani.css (.landing-faq-*).
 */
export default function LandingFaqItem({
  question,
  answer,
  compact = false,
}: {
  question: string;
  answer: string;
  compact?: boolean;
}) {
  return (
    <details className={`landing-faq-item${compact ? " landing-faq-item--compact" : ""}`}>
      <summary className="landing-faq-summary">
        <span className="landing-faq-question">{question}</span>
        <span className="landing-faq-chevron" aria-hidden="true">
          <Icon i="chevron-down" size={compact ? 16 : 18} />
        </span>
      </summary>
      <div className="landing-faq-answer">
        <p>{answer}</p>
      </div>
    </details>
  );
}
