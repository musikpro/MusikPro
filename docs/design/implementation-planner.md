# Banani → Implementation Planner

Après l'import d'écrans Banani, l'IA doit **d'abord** mettre à jour `design/banani/screens.json` avec un inventaire fidèle des écrans et leurs routes/états. Elle lance ensuite :

```bash
npm run design:plan
```

Le résultat `generated/implementation-plan.md` devient le plan de travail de référence.

## Règle d'or

Aucun agent ne doit commencer une implémentation globale du SaaS immédiatement après avoir reçu des écrans. Il doit d'abord :

1. inventorier les écrans ;
2. identifier composants réutilisables ;
3. mapper données et tables ;
4. mapper API/Server Actions ;
5. mapper permissions et rôles ;
6. identifier paiements, emails, fichiers et jobs ;
7. produire les phases et critères de validation ;
8. coder phase par phase.

Si un écran seul ne permet pas de déduire une règle métier, l'agent marque `À CONFIRMER` au lieu de l'inventer.
