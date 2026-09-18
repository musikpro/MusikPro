# 04 — Authentification

- Vérification email pour les comptes qui accèdent à des fonctions sensibles.
- 2FA obligatoire pour les administrateurs en mode `high`/`maximum`.
- Rate limit sur login, reset password, signup et invitations.
- Révoque les sessions après changement de mot de passe ou événement de sécurité sérieux.
- Les rôles et permissions sont vérifiés côté serveur à chaque action sensible.
- Ne bloque pas automatiquement un utilisateur africain uniquement sur changement d'IP: réseaux mobiles/CGNAT changent souvent d'adresse.
