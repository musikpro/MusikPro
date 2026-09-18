# Authentification et livraison e-mail

Africa SaaS Kit sépare le **mode d’authentification** du **service d’e-mail**.

- `AUTH_EMAIL_PASSWORD_ENABLED=true` active email + mot de passe.
- `AUTH_REQUIRE_EMAIL_VERIFICATION=true` impose la vérification e-mail en production.
- Si email/mot de passe est actif en production, `RESEND_API_KEY` et `EMAIL_FROM` doivent être opérationnels.
- Si tu ne veux pas Resend, désactive email/mot de passe et active un autre mode d’auth réel (par exemple Google OAuth).

Le kit refuse ainsi le faux scénario « inscription possible mais aucun e-mail de vérification/récupération ne peut arriver ».

## Gate avant production

1. créer un compte de test ;
2. recevoir et utiliser l’e-mail de vérification ;
3. lancer un mot de passe oublié ;
4. recevoir et utiliser le lien de reset ;
5. vérifier qu’un compte non vérifié ne contourne pas les règles du produit.
