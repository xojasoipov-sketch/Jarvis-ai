#!/usr/bin/env bash
# Jarvis (Hermes) — lokal yoki Railway oldidan fayllarni joylashtirish
# Railway uchun asosan README dagi qadamlarni bajaring.
# Lokal kompyuterda ishlatmoqchi bo'lsangiz:

set -e

HERMES_HOME="${HERMES_HOME:-$HOME/.hermes}"
REPO_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

echo "==> Hermes uy papkasi: $HERMES_HOME"
mkdir -p "$HERMES_HOME"

if ! command -v hermes >/dev/null 2>&1; then
  echo "⚠️  'hermes' topilmadi. Avval o'rnating:"
  echo "    curl -fsSL https://hermes-agent.nousresearch.com/install.sh | bash"
  exit 1
fi
echo "==> Hermes: $(command -v hermes)"

if [ -f "$HERMES_HOME/config.yaml" ]; then
  cp "$HERMES_HOME/config.yaml" "$HERMES_HOME/config.yaml.bak.$(date +%s)"
  echo "==> Eski config.yaml zaxiralandi"
fi

cp "$REPO_DIR/config/config.yaml" "$HERMES_HOME/config.yaml"
cp "$REPO_DIR/config/AGENTS.md" "$HERMES_HOME/AGENTS.md"
echo "==> config.yaml va AGENTS.md joylashtirildi"

if [ ! -f "$HERMES_HOME/.env" ]; then
  cp "$REPO_DIR/.env.example" "$HERMES_HOME/.env"
  echo "==> .env shablon yaratildi — to'ldiring: nano $HERMES_HOME/.env"
else
  echo "==> Mavjud .env saqlanib qoldi"
fi

echo ""
echo "==> Keyingi qadamlar (lokal):"
echo "  1. $HERMES_HOME/.env ni to'ldiring"
echo "  2. hermes gateway setup"
echo "  3. hermes gateway start"
echo ""
echo "Railway uchun: README.md dagi C bo'limini bajaring."
echo "✅ Tugadi."
