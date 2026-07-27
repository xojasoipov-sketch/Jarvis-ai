#!/usr/bin/env bash
# Hermes + Obsidian + Telegram + Ovoz + Kompyuter/Telefon "Jarvis" — avtomatik joylashtirish
#
# Foydalanish:
#   chmod +x setup.sh
#   ./setup.sh
#
# Bu skript FAQAT fayllarni joylashtiradi va bog'liqliklarni tekshiradi.
# .env fayliga haqiqiy tokenlarni SIZ QO'LDA kiritishingiz kerak bo'ladi —
# skript hech qanday maxfiy qiymatni o'zi to'ldirmaydi yoki taxmin qilmaydi.

set -e

HERMES_HOME="${HERMES_HOME:-$HOME/.hermes}"
REPO_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

echo "==> Hermes uy papkasi: $HERMES_HOME"
mkdir -p "$HERMES_HOME"

# --- 1) Hermes o'rnatilganini tekshirish ---
if ! command -v hermes >/dev/null 2>&1; then
  echo "⚠️  'hermes' buyrug'i topilmadi. Avval Hermes'ni o'rnating:"
  echo "    curl -fsSL https://hermes-agent.nousresearch.com/install.sh | bash"
  echo "    Keyin bu skriptni qayta ishga tushiring."
  exit 1
fi
echo "==> Hermes topildi: $(command -v hermes)"

# --- 2) config.yaml va AGENTS.md joylashtirish ---
if [ -f "$HERMES_HOME/config.yaml" ]; then
  cp "$HERMES_HOME/config.yaml" "$HERMES_HOME/config.yaml.bak.$(date +%s)"
  echo "==> Mavjud config.yaml zaxiralandi (.bak fayl sifatida)"
fi
cp "$REPO_DIR/config/config.yaml" "$HERMES_HOME/config.yaml"
cp "$REPO_DIR/config/AGENTS.md" "$HERMES_HOME/AGENTS.md"
echo "==> config.yaml va AGENTS.md joylashtirildi"

# --- 3) .env joylashtirish (agar mavjud bo'lmasa) ---
if [ -f "$HERMES_HOME/.env" ]; then
  echo "==> Mavjud .env topildi — o'zgartirilmadi (qo'lda tekshiring)"
else
  cp "$REPO_DIR/.env.example" "$HERMES_HOME/.env"
  echo "==> .env yaratildi shablon asosida."
  echo "    ‼️  ENDI: nano $HERMES_HOME/.env — haqiqiy tokenlaringizni kiriting"
fi

# --- 4) Bog'liqliklarni tekshirish ---
echo "==> Bog'liqliklar tekshirilmoqda..."
command -v node  >/dev/null 2>&1 && echo "  ✅ node:  $(node --version)"  || echo "  ❌ node topilmadi (Obsidian/mobile MCP uchun kerak)"
command -v npx   >/dev/null 2>&1 && echo "  ✅ npx:   $(npx --version)"   || echo "  ❌ npx topilmadi"
command -v ffmpeg >/dev/null 2>&1 && echo "  ✅ ffmpeg topildi"           || echo "  ⚠️  ffmpeg topilmadi (ovozli xabarlar uchun kerak)"
command -v adb   >/dev/null 2>&1 && echo "  ✅ adb topildi (Android)"    || echo "  ⚠️  adb topilmadi (Android boshqaruvi uchun kerak)"
command -v ios   >/dev/null 2>&1 && echo "  ✅ go-ios topildi (iOS)"     || echo "  ⚠️  go-ios topilmadi (iOS boshqaruvi uchun kerak)"

echo ""
echo "==> Keyingi qadamlar:"
echo "  1. $HERMES_HOME/.env faylini to'ldiring (agar hali qilmagan bo'lsangiz)"
echo "  2. hermes tools            # Computer Use'ni yoqish uchun"
echo "  3. hermes gateway setup    # Telegram'ni ulash uchun"
echo "  4. hermes gateway start    # Jarvisni ishga tushirish"
echo ""
echo "✅ Joylashtirish tugadi."
