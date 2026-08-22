#!/bin/bash
# AHBA console — pre-push guard. Patakbuhin BAGO ang bawat push:  bash deploy-check.sh
# Pinipigilan ang paulit-ulit na version-drift bugs: lahat ng ?v= cache-bust tags,
# APP_VERSION, at version.json ay dapat magkakapareho, at pasado ang lint.
set -u
cd "$(dirname "$0")"
AV=$(grep -o "APP_VERSION='[^']*'" app.js | head -1 | cut -d"'" -f2)
VJ=$(grep -o '"version" *: *"[^"]*"' version.json | sed 's/.*: *"//; s/"//')
TAGS=$(grep -o '?v=[0-9A-Za-z.\-]*' index.html | sed 's/?v=//' | sort -u)
echo "APP_VERSION = $AV"
echo "version.json = $VJ"
echo "index.html ?v= tags: $(echo $TAGS | tr '\n' ' ')"
FAIL=0
[ -n "$AV" ] || { echo "❌ Hindi mabasa ang APP_VERSION sa app.js"; FAIL=1; }
[ "$AV" = "$VJ" ] || { echo "❌ version.json ($VJ) != APP_VERSION ($AV) — ang stale-tab nudge ay HINDI gagana"; FAIL=1; }
for t in $TAGS; do
  [ "$t" = "$AV" ] || { echo "❌ May ?v=$t sa index.html na != APP_VERSION ($AV) — may user na maiiwan sa cached na file"; FAIL=1; }
done
node --check app.js       || { echo "❌ lint: app.js"; FAIL=1; }
node --check ahba-cloud.js || { echo "❌ lint: ahba-cloud.js"; FAIL=1; }
if [ $FAIL = 0 ]; then echo "✅ DEPLOY CHECK PASSED — safe to push"; else echo "🛑 HUWAG I-PUSH — ayusin muna ang nasa itaas"; exit 1; fi
