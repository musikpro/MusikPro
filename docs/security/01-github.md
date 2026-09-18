# 01 — Sécuriser GitHub

- Active la 2FA sur tous les comptes ayant accès au dépôt.
- Protège `main`: pull request obligatoire, CI verte, pas de force-push.
- Active Dependabot alerts/updates et secret scanning si disponibles sur ton plan.
- Ne commit jamais `.env`, clés API, certificats ou exports de base de données.
- Utilise les secrets GitHub uniquement pour la CI qui en a réellement besoin.
- Révoque immédiatement tout secret accidentellement commité; supprimer le fichier de Git ne suffit pas.
