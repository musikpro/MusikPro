# Accessibility & UX Quality Gate

Ce contrôle complète Mobile First, SEO, Design et Premium Icon Gate.

## Contrôles statiques à haute confiance

- images HTML avec `alt` ;
- pas de `onClick` sur `div/span` non interactif sans rôle/clavier ;
- pas de suppression du focus (`outline-none`) sans style `focus-visible` équivalent ;
- boutons uniquement icône avec nom accessible ;
- pas de `tabIndex` positif ;
- pas d'usage UI de `dangerouslySetInnerHTML` hors exception JSON-LD documentée.

Commande : `npm run accessibility:check`.

## Vérification navigateur

La validation visuelle reste nécessaire pour :

- navigation clavier ;
- focus visible ;
- contraste ;
- tailles tactiles ;
- modales ;
- zoom et reflow ;
- 320/360/390/430/768/1024/1440 px ;
- `prefers-reduced-motion`.

Si le Browser Tool n'est pas disponible, marquer cette partie **NON VÉRIFIÉE**.
