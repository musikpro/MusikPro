#!/usr/bin/env bash
set -uo pipefail
TARGET="${1:-.}"
cd "$TARGET" || exit 1
EX=(--exclude-dir=node_modules --exclude-dir=.git --exclude-dir=.next --exclude-dir=dist --exclude-dir=build --exclude-dir=coverage)
CODE=(--include='*.ts' --include='*.tsx' --include='*.js' --include='*.jsx' --include='*.mjs' --include='*.json' --include='*.yml' --include='*.yaml')

section(){ printf '\n=== %s ===\n' "$1"; }
scan(){ local out; out=$(eval "$1" 2>/dev/null | head -40); if [ -n "$out" ]; then echo "$out"; else echo '  (rien trouvé)'; fi; }

section "1. Secrets potentiels en clair"
scan "grep -rEn \"sk_live_[A-Za-z0-9_-]{10,}|sk-[A-Za-z0-9_-]{20,}|ghp_[A-Za-z0-9]{20,}|AIza[0-9A-Za-z_-]{30,}|AKIA[0-9A-Z]{16}|-----BEGIN (RSA |EC )?PRIVATE KEY-----\" ${CODE[*]} ${EX[*]} ."

section "2. Variables publiques à examiner"
scan "grep -rEn \"NEXT_PUBLIC_\" --include='.env*' --include='*.ts' --include='*.tsx' --include='*.js' --include='*.mjs' ${EX[*]} ."

section "3. Couverture .gitignore"
for f in .env .env.local .env.production .env.development.local; do
  if git check-ignore -q "$f" 2>/dev/null || grep -qE '^\.env\*?$|^\.env\.local$|^\.env\*\.local$' .gitignore 2>/dev/null; then echo "  ✓ $f ignoré"; else echo "  ⚠ $f à vérifier"; fi
done

section "4. Historique Git — fichiers sensibles"
if [ -d .git ]; then
  git log --all --full-history --name-only --pretty=format: 2>/dev/null | sort -u | grep -Ei '(^|/)\.env($|\.)|credential|serviceaccount|\.pem$|\.key$' | head -30 || echo '  (rien trouvé)'
else echo '  (pas de dépôt Git dans cette copie)'; fi

section "5. Identité/autorisation prises depuis le client"
scan "grep -rEn \"(body|req\.body|req\.query)\.(userId|user_id|role|credits)|update\((req\.)?body\)|\.set\((req\.)?body\)\" ${CODE[*]} ${EX[*]} ."

section "6. Rendu HTML brut / XSS"
scan "grep -rn \"dangerouslySetInnerHTML\|innerHTML *=\|{@html\|v-html\" ${CODE[*]} ${EX[*]} ."

section "7. SQL brut potentiellement concaténé"
scan "grep -rEn \"query\(.*\+|query\(\x60.*\\\$\{|execute\(.*%s\" ${CODE[*]} ${EX[*]} ."

section "8. Validation serveur (signal)"
scan "grep -rln \"from ['\\\"]zod['\\\"]\|z\.object\|safeParse\" ${CODE[*]} ${EX[*]} app lib"

section "9. Webhooks et vérification"
scan "grep -rEn \"verifyWebhook|timingSafeEqual|constructEvent|X-Moneroo-Signature|X-Secret-Key|hmac\" app lib ${EX[*]}"

section "10. Headers de sécurité"
scan "grep -rEn \"Content-Security-Policy|Strict-Transport-Security|X-Content-Type-Options|Referrer-Policy|Permissions-Policy\" next.config.* lib app ${EX[*]}"

section "11. Rate limiting"
scan "grep -rEn \"rateLimit|Ratelimit|UPSTASH|Too many requests\" app lib ${EX[*]}"

section "12. Lockfile"
if [ -f package-lock.json ] || [ -f pnpm-lock.yaml ] || [ -f yarn.lock ] || [ -f bun.lock ] || [ -f bun.lockb ]; then echo '  ✓ lockfile présent'; else echo '  ❌ aucun lockfile — exécuter npm install puis commiter package-lock.json'; fi

section "13. Dépendances"
if [ -f package-lock.json ]; then npm audit --omit=dev 2>/dev/null | tail -20 || true; else echo '  npm audit complet indisponible sans package-lock.json'; fi

section "14. Secret scan du bundle"
if [ -d .next/static ]; then
  scan "grep -rEn \"sk_live_|service_role|GOOGLE_CLIENT_SECRET|PAYDUNYA_PRIVATE_KEY|FEDAPAY_SECRET_KEY|CHARIOW_API_KEY\" .next/static"
else echo '  construire d’abord avec npm run build, puis relancer ce scan'; fi

printf '\n=== RAPPEL ===\n'
echo 'Ce script produit des signaux, pas un verdict. Vérifier manuellement chaque résultat.'
echo 'Tester aussi deux comptes différents, les propriétés de ressources, les cookies, les uploads et les secrets côté hébergeur.'
