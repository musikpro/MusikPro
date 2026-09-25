# Computer Use / Browser Tools dans Antigravity

## Rôle

Le Browser Subagent d’Antigravity permet à l’agent d’ouvrir, lire et manipuler un navigateur Chrome local. Dans Africa SaaS Kit, il sert de **couche de vérification visuelle continue** : le code n’est pas considéré terminé uniquement parce qu’il compile ; l’agent doit aussi observer les pages et parcours lorsque c’est pertinent.

## Installation ou activation ?

Il n’y a pas de dépendance npm à installer dans le SaaS. La capacité navigateur fait partie d’Antigravity. Le kit vérifie donc son **activation et son fonctionnement**, pas la présence d’un package JavaScript.

## Activation

1. Ouvrir Antigravity Settings.
2. Aller dans la section **Browser**.
3. Vérifier que **Browser Tools** ne sont pas désactivés.
4. Pour un bon compromis sécurité/autonomie, conserver une politique de **Request Review** pour les actions navigateur sensibles.
5. Autoriser uniquement les domaines réellement nécessaires lorsque l’Allowlist le demande.

## Test de preuve

1. Demander à l’agent d’utiliser le Browser Subagent pour ouvrir `https://www.antigravity.google/docs/browser`.
2. Vérifier qu’il peut lire le titre et le contenu de la page.
3. Marquer alors la capacité vérifiée : `npm run computer-use:mark -- --status=verified --evidence="documentation Antigravity ouverte via Browser Subagent"`.
4. `npm run computer-use:check`.
5. Après `npm install`, lancer le SaaS et poursuivre les preuves sur `http://localhost:3000` et `/api/health`.

Le statut est stocké localement sous `.africa-saas/` et n’est pas commité.

## Vérification continue

Utiliser Computer Use à chaque gate visuel : responsive, navigation, loading states, formulaires, OAuth, uploads, paiements sandbox, previews Vercel, SEO public et domaine final.

## Ce que Computer Use ne prouve pas

Voir une page fonctionner ne prouve pas l’absence de faille. Les commandes `security:check`, `security:audit`, `test`, `typecheck`, `build`, `audit:prod` et `conformity:check` restent obligatoires.
