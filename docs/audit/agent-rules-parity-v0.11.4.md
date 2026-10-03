# Africa SaaS Kit V0.11.4 — Parité des règles Codex / Claude Code

## Objectif

Garantir qu’aucune règle générale ou interdiction de `AGENTS.md` (Codex/ChatGPT/Antigravity) ne manque dans `CLAUDE.md` (Claude Code / Anthropic).

## Constat avant refactorisation

- `AGENTS.md` contenait 38 rubriques de règles.
- 35 rubriques n’étaient pas reprises comme rubriques dans l’ancien `CLAUDE.md`.
- La règle permanente **Premium Icon Gate** interdisant les Sparkles/Sparklets n’était notamment pas recopiée dans `CLAUDE.md`.
- Aucun usage interdit n’était présent dans le code UI courant sous `app/` et `components/`.

## Refactorisation

1. `CLAUDE.md` contient désormais un bloc miroir intégral de `AGENTS.md`.
2. `npm run agents:rules-sync` reconstruit ce miroir depuis la source de vérité.
3. `npm run agents:rules-check` compare le miroir à `AGENTS.md` et échoue au moindre écart.
4. `npm run claude-code:check` exécute aussi ce contrôle.
5. `kit:integrity` vérifie directement la parité AGENTS → CLAUDE.
6. La règle Premium Icon couvre explicitement Sparkle/Sparkles/Sparklet/Spartlet/Spartlette, WandSparkle(s), variantes `*Icon` et glyphes décoratifs.
7. Toute occurrence détectée sous `app/` ou `components/` est bloquante et doit être retirée immédiatement.
8. Une carte avec voyant **Règle UI — Sparkles interdites** est garantie dans l’État de préparation et l’État production via `config/readiness-ui.json`.

## Commandes de validation

```bash
npm run agents:rules-check
npm run claude-code:check
npm run ui:icons-check
npm run readiness:ui-check
npm run kit:integrity
npm run kit:audit
```

## Validation finale

- Parité AGENTS → CLAUDE : **PASS — 39 rubriques synchronisées** (38 rubriques existantes + la nouvelle règle permanente de parité).
- Premium Icon Gate : **PASS — 73 fichiers UI scannés, 0 occurrence interdite**.
- Readiness UI : **PASS — 6 cartes garanties dans État de préparation + 6 dans État production**, dont `premium-icons`.
- `kit:integrity` : **PASS — 60 fichiers critiques**.
- `kit:audit` : **PASS — 30/30 contrôles**.
- Rapport de conformité : **PASS — 250 PASS / 3 WARN / 0 FAIL**.
- Test d’intégrité complet : **STATIC PASS · DYNAMIC PENDING** car `package-lock.json` et `node_modules` ne sont pas présents dans le starter; lint/typecheck/tests/build/npm audit devront être exécutés après `npm install`.
- Production Doctor : la carte `Règle UI — Sparkles interdites` est générée avec le statut **PASS**. Le score global du Production Doctor dans cet environnement de test reste non prêt à cause des services/secrets de production volontairement non configurés, et non à cause de cette règle UI.
