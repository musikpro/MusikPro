#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
OUT="$(mktemp -d)"
trap 'rm -rf "$OUT"' EXIT
cd "$ROOT"
if [ -x node_modules/.bin/tsc ]; then TSC=node_modules/.bin/tsc; else TSC=tsc; fi
"$TSC" --strict --target ES2022 --module CommonJS --moduleResolution Node --outDir "$OUT" \
 lib/phonetics-offline/engine.ts lib/phonetics-offline/dictionary.ts \
 lib/phonetics-offline/adopted-french-dictionary.ts \
 lib/phonetics-offline/african-muslim-used-names-dictionary.ts
node tests/test-phonetics.cjs "$OUT/engine.js" "$OUT/dictionary.js" "$OUT/adopted-french-dictionary.js" "$OUT/african-muslim-used-names-dictionary.js"
grep -q 'readOnly' components/banani/StepRecipient.tsx
grep -q 'aria-readonly="true"' components/banani/StepRecipient.tsx
