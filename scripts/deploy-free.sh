#!/usr/bin/env bash
# Open the one-click Render free deploy for Murali Transport.
set -euo pipefail

REPO_URL="https://github.com/SatishKallepalli-KSO/murali-transport"
DEPLOY_URL="https://render.com/deploy?repo=${REPO_URL}"
LIVE_URL="https://murali-transport.onrender.com"

echo ""
echo "Murali Transport — free live deploy (Render)"
echo "==========================================="
echo ""
echo "1) One-click Blueprint (browser):"
echo "   ${DEPLOY_URL}"
echo ""
echo "2) After deploy, set DATABASE_URL to Neon pooled URL, then:"
echo "   ${LIVE_URL}"
echo ""

if command -v open >/dev/null 2>&1; then
  open "${DEPLOY_URL}"
elif command -v xdg-open >/dev/null 2>&1; then
  xdg-open "${DEPLOY_URL}"
else
  echo "Open the Blueprint URL above in your browser."
fi
