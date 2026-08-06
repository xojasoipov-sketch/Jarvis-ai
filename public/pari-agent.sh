#!/data/data/com.termux/files/usr/bin/bash
# Pari AI Agent — background phone agent
# Installs itself, registers device, polls for commands forever
# Usage: curl -sS https://jarvis-ai-production-41a9.up.railway.app/pari-agent.sh | bash

set -e

SERVER="https://jarvis-ai-production-41a9.up.railway.app"
DEVICE_ID_FILE="$HOME/.pari_device_id"
AGENT_FILE="$HOME/.pari_agent.sh"
BOOT_DIR="$HOME/.termux/boot"
LOG="$HOME/.pari_agent.log"
POLL_INTERVAL=8  # seconds

# ── Colors ────────────────────────────────────────────────────────────────────
G="\033[0;32m"; O="\033[0;33m"; R="\033[0;31m"; N="\033[0m"
info()  { echo -e "${G}[Pari]${N} $*"; }
warn()  { echo -e "${O}[Pari]${N} $*"; }
err()   { echo -e "${R}[Pari]${N} $*"; }

echo ""
echo -e "${O}  ⚡ Pari AI — Telefon Agent${N}"
echo "  ================================"
echo ""

# ── Step 1: Install packages ──────────────────────────────────────────────────
info "Kerakli paketlar o'rnatilmoqda..."
pkg update -y -q 2>/dev/null || true
pkg install -y -q termux-api curl jq 2>/dev/null || {
  warn "pkg install failed, trying apt..."
  apt-get install -y -q termux-api curl jq 2>/dev/null || true
}

# ── Step 2: Device ID ─────────────────────────────────────────────────────────
if [ -f "$DEVICE_ID_FILE" ]; then
  DEVICE_ID=$(cat "$DEVICE_ID_FILE")
  info "Mavjud device ID: $DEVICE_ID"
else
  DEVICE_ID="ph_$(cat /proc/sys/kernel/random/uuid | tr -d '-' | head -c 12)"
  echo "$DEVICE_ID" > "$DEVICE_ID_FILE"
  info "Yangi device ID: $DEVICE_ID"
fi

DEVICE_NAME="$(getprop ro.product.model 2>/dev/null || echo 'Android')"

# ── Step 3: Register with Pari ────────────────────────────────────────────────
info "Pari serveriga ulanmoqda..."
REG_RESULT=$(curl -s -X POST "$SERVER/api/phones" \
  -H "Content-Type: application/json" \
  -d "{\"id\":\"$DEVICE_ID\",\"name\":\"$DEVICE_NAME\",\"platform\":\"android\"}" \
  --connect-timeout 10 2>/dev/null)

if echo "$REG_RESULT" | grep -q '"ok":true'; then
  info "✅ Muvaffaqiyatli ulandi: $DEVICE_NAME"
else
  warn "Server javob bermadi, offline rejimda ishlaydi"
fi

# ── Step 4: Write persistent agent script ────────────────────────────────────
info "Agent skript yozilmoqda..."
cat > "$AGENT_FILE" << SCRIPT
#!/data/data/com.termux/files/usr/bin/bash
# Pari AI background agent — auto-generated
SERVER="$SERVER"
DEVICE_ID="$DEVICE_ID"
LOG="$LOG"
POLL="$POLL_INTERVAL"

log() { echo "\$(date '+%H:%M:%S') \$*" >> "\$LOG"; }

# Keep screen/network awake
termux-wake-lock 2>/dev/null || true

log "Pari agent started — polling every \${POLL}s"

while true; do
  # Heartbeat + poll for commands
  RESP=\$(curl -s "\$SERVER/api/phones?action=poll&device_id=\$DEVICE_ID" \\
    --connect-timeout 8 --max-time 12 2>/dev/null)

  COUNT=\$(echo "\$RESP" | jq -r '.count // 0' 2>/dev/null || echo "0")

  if [ "\$COUNT" -gt "0" ]; then
    log "\$COUNT buyruq keldi"
    echo "\$RESP" | jq -c '.commands[]' 2>/dev/null | while IFS= read -r CMD; do
      ACTION=\$(echo "\$CMD" | jq -r '.action // "custom"')
      log "Bajarilmoqda: \$ACTION"

      case "\$ACTION" in
        sms)
          NUM=\$(echo "\$CMD" | jq -r '.payload.number // ""')
          MSG=\$(echo "\$CMD" | jq -r '.payload.message // ""')
          [ -n "\$NUM" ] && termux-sms-send -n "\$NUM" "\$MSG" 2>/dev/null && log "SMS yuborildi → \$NUM"
          ;;
        call)
          NUM=\$(echo "\$CMD" | jq -r '.payload.number // ""')
          [ -n "\$NUM" ] && termux-telephony-call "\$NUM" 2>/dev/null && log "Qo'ng'iroq → \$NUM"
          ;;
        notify)
          TITLE=\$(echo "\$CMD" | jq -r '.payload.title // "Pari"')
          MSG=\$(echo "\$CMD" | jq -r '.payload.message // ""')
          termux-notification --title "\$TITLE" --content "\$MSG" --id 42 2>/dev/null && log "Bildirishnoma: \$TITLE"
          ;;
        volume)
          LVL=\$(echo "\$CMD" | jq -r '.payload.level // "50"')
          termux-volume music \$LVL 2>/dev/null && log "Ovoz: \$LVL"
          ;;
        torch)
          ON=\$(echo "\$CMD" | jq -r '.payload.on // "true"')
          [ "\$ON" = "true" ] && termux-torch on 2>/dev/null || termux-torch off 2>/dev/null
          log "Fonar: \$ON"
          ;;
        location)
          LOC=\$(termux-location 2>/dev/null | jq -r '"\(.latitude),\(.longitude)"' 2>/dev/null || echo "unknown")
          curl -s -X POST "\$SERVER/api/phones?action=result" \\
            -H "Content-Type: application/json" \\
            -d "{\"device_id\":\"\$DEVICE_ID\",\"result\":\"\$LOC\"}" >/dev/null 2>&1
          log "Joylashuv: \$LOC"
          ;;
        vibrate)
          termux-vibrate -d 500 2>/dev/null && log "Vibro"
          ;;
        tts)
          TEXT=\$(echo "\$CMD" | jq -r '.payload.text // ""')
          [ -n "\$TEXT" ] && termux-tts-speak "\$TEXT" 2>/dev/null && log "TTS: \$TEXT"
          ;;
        screenshot)
          termux-screenshot -f /tmp/pari_ss.png 2>/dev/null || true
          log "Screenshot olindi"
          ;;
        *)
          log "Noma'lum buyruq: \$ACTION"
          ;;
      esac
    done
  fi

  sleep "\$POLL"
done
SCRIPT

chmod +x "$AGENT_FILE"
info "Agent skript tayyor: $AGENT_FILE"

# ── Step 5: Auto-start on boot ────────────────────────────────────────────────
mkdir -p "$BOOT_DIR"
cat > "$BOOT_DIR/pari.sh" << BOOT
#!/data/data/com.termux/files/usr/bin/bash
# Auto-start Pari agent on phone boot
sleep 10  # wait for network
bash "$AGENT_FILE" >> "$LOG" 2>&1 &
BOOT
chmod +x "$BOOT_DIR/pari.sh"
info "Boot da avtomatik yoqiladi ✅"

# ── Step 6: Start agent now ───────────────────────────────────────────────────
info "Agent ishga tushirilmoqda (background)..."

# Kill any existing instance
pkill -f "pari_agent" 2>/dev/null || true
sleep 1

# Start in background
nohup bash "$AGENT_FILE" >> "$LOG" 2>&1 &
AGENT_PID=$!
sleep 2

if kill -0 "$AGENT_PID" 2>/dev/null; then
  info "✅ Agent ishlayapti (PID: $AGENT_PID)"
else
  warn "Agent to'xtatildi, log ni tekshiring: $LOG"
fi

echo ""
echo -e "${G}  ═══════════════════════════════${N}"
echo -e "${G}  ✅ Pari Agent muvaffaqiyatli ulandi!${N}"
echo -e "${G}  ═══════════════════════════════${N}"
echo ""
echo -e "  ${O}Qurilma:${N} $DEVICE_NAME"
echo -e "  ${O}ID:${N} $DEVICE_ID"
echo -e "  ${O}Polling:${N} har ${POLL_INTERVAL}s"
echo -e "  ${O}Log:${N} $LOG"
echo ""
echo -e "  Endi bu Termux oynasini yopishingiz mumkin."
echo -e "  Agent background'da ishlayveradi."
echo ""
