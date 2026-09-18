# Skeleton Loading — règle de livraison UI

Africa SaaS Kit utilise des skeleton loaders comme état de chargement principal des pages et zones de données.

## Règles obligatoires pour l'IA

1. Toute route App Router qui attend des données serveur doit avoir un `loading.tsx` pertinent, ou une frontière `<Suspense fallback={...}>` pour une zone chargée séparément.
2. Le skeleton doit imiter la structure finale : cartes KPI pour des KPI, lignes pour du texte, tableau pour un tableau, formulaire pour un formulaire. Éviter le skeleton générique qui ne ressemble pas au contenu final.
3. Concevoir le skeleton mobile-first à 320/360/390/430 px, puis tablette et desktop.
4. Éviter le layout shift : dimensions et nombre de blocs proches du contenu final.
5. Ne jamais afficher de vraies données, tokens, emails ou secrets dans un skeleton.
6. Ne pas simuler artificiellement un délai pour montrer le skeleton. Si les données sont instantanées, l'utilisateur doit voir le contenu immédiatement.
7. Pour un contenu partiellement disponible, streamer avec `Suspense` plutôt que bloquer toute la page.
8. Le shimmer respecte `prefers-reduced-motion: reduce`.
9. Utiliser `aria-busy="true"` et un texte lecteur d'écran « Chargement… » sur les principaux états de page.
10. Un skeleton ne remplace pas les états `empty`, `error`, `unauthorized` et `offline`.

## Validation

Tester les transitions navigation → skeleton → contenu aux viewports 320, 360, 390, 430, 768, 1024 et 1440 px. Le contenu ne doit pas provoquer de scroll horizontal global ni de saut visuel important.
