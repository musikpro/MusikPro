# 07 — Cloudflare

- Force HTTPS et désactive les protocoles obsolètes.
- Active Turnstile sur les formulaires exposés aux bots.
- Utilise WAF/rate limiting pour les endpoints publics sensibles si disponible.
- Ne crée pas de règles qui bloquent aveuglément les IP mobiles partagées/CGNAT.
- Vérifie la CSP après ajout de scripts tiers.
