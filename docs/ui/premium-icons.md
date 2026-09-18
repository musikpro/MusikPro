# Premium Icon Gate

Africa SaaS Kit interdit les icônes **Sparkle/Sparkles/Sparklet**, les baguettes scintillantes et les glyphes décoratifs typiquement utilisés pour signaler une fonctionnalité « IA » sans raison sémantique.

## Objectif

Le SaaS doit conserver une identité moderne et professionnelle, sans marqueurs visuels génériques qui donnent l’impression d’une interface générée automatiquement.

## Règles obligatoires

1. Ne pas utiliser `Sparkle`, `Sparkles`, `WandSparkles`, `WandSparkle`, `✨`, `✦`, `✧`, `★` ou variantes équivalentes comme décoration UI.
2. Choisir une icône d’après **le sens de l’action** : maison pour accueil, grille pour dashboard, carte pour facturation, bouclier pour sécurité, etc.
3. Pour les composants du kit, préférer `components/ui/premium-icon.tsx` afin de conserver le même trait, les mêmes proportions et la même accessibilité.
4. Une nouvelle bibliothèque d’icônes peut être adoptée si elle est professionnelle, cohérente et auditée ; elle ne doit pas réintroduire de Sparkles décoratifs.
5. Ne pas utiliser des caractères Unicode (`⌂`, `◫`, `◉`, `◇`, etc.) comme substituts rapides d’icônes dans la navigation.
6. Les icônes purement décoratives doivent être masquées des technologies d’assistance (`aria-hidden`). Les boutons icon-only doivent garder un nom accessible.

## Vérification permanente

Exécuter :

```bash
npm run ui:icons-check
```

Le contrôle scanne `app/` et `components/`. Il est aussi inclus dans `verify:code`, `verify:production` et `ci:check`. Une nouvelle page qui réintroduit une icône interdite doit donc faire échouer la livraison.

## Refactorisation actuelle

La navigation mobile du starter utilise désormais des SVG premium homogènes via `PremiumIcon` à la place des anciens glyphes Unicode.
