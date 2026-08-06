#!/data/data/com.termux/files/usr/bin/bash
# Pari AI Agent — to'liq Android nazorat
# Installs itself, registers device, polls for commands forever
# Usage: curl -sS <server>/pari-agent.sh | bash -s <server> <device_id>

set -e

# Accept server URL and device ID from args (passed by setup page)
SERVER="${1:-https://jarvis-ai-production-41a9.up.railway.app}"
DEVICE_ID_ARG="${2:-}"

DEVICE_ID_FILE="$HOME/.pari_device_id"
AGENT_FILE="$HOME/.pari_agent.sh"
BOOT_DIR="$HOME/.termux/boot"
LOG="$HOME/.pari_agent.log"
POLL_INTERVAL=6  # seconds

# ── Colors ────────────────────────────────────────────────────────────────────
G="\033[0;32m"; O="\033[0;33m"; R="\033[0;31m"; N="\033[0m"
info()  { echo -e "${G}[Pari]${N} $*"; }
warn()  { echo -e "${O}[Pari]${N} $*"; }
err()   { echo -e "${R}[Pari]${N} $*"; }

echo ""
echo -e "${O}  ⚡ Pari AI — To'liq Android Agent${N}"
echo "  ================================="
echo ""

# ── Step 1: Install packages ──────────────────────────────────────────────────
info "Kerakli paketlar o'rnatilmoqda..."
pkg update -y -q 2>/dev/null || true
pkg install -y -q termux-api curl jq python ffmpeg 2>/dev/null || {
  warn "pkg install failed, trying apt..."
  apt-get install -y -q termux-api curl jq python ffmpeg 2>/dev/null || true
}

# ── Step 2: Device ID ─────────────────────────────────────────────────────────
if [ -n "$DEVICE_ID_ARG" ]; then
  DEVICE_ID="$DEVICE_ID_ARG"
  echo "$DEVICE_ID" > "$DEVICE_ID_FILE"
  info "Setup dan kelgan device ID: $DEVICE_ID"
elif [ -f "$DEVICE_ID_FILE" ]; then
  DEVICE_ID=$(cat "$DEVICE_ID_FILE")
  info "Mavjud device ID: $DEVICE_ID"
else
  DEVICE_ID="ph_$(cat /proc/sys/kernel/random/uuid | tr -d '-' | head -c 12)"
  echo "$DEVICE_ID" > "$DEVICE_ID_FILE"
  info "Yangi device ID: $DEVICE_ID"
fi

DEVICE_NAME="$(getprop ro.product.model 2>/dev/null || echo 'Android')"
ANDROID_VER="$(getprop ro.build.version.release 2>/dev/null || echo '?')"

# ── Step 3: Register with Pari ────────────────────────────────────────────────
info "Pari serveriga ulanmoqda ($SERVER)..."
REG_RESULT=$(curl -s -X POST "$SERVER/api/phones" \
  -H "Content-Type: application/json" \
  -d "{\"id\":\"$DEVICE_ID\",\"name\":\"$DEVICE_NAME\",\"platform\":\"android\",\"android_ver\":\"$ANDROID_VER\"}" \
  --connect-timeout 10 2>/dev/null)

if echo "$REG_RESULT" | grep -q '"ok":true'; then
  info "✅ Muvaffaqiyatli ulandi: $DEVICE_NAME (Android $ANDROID_VER)"
else
  warn "Server javob bermadi, offline rejimda ishlaydi"
fi

# ── Step 4: Write persistent agent script ─────────────────────────────────────
info "Agent skript yozilmoqda..."
cat > "$AGENT_FILE" << 'AGENTEOF'
#!/data/data/com.termux/files/usr/bin/bash
# Pari AI — To'liq Android Agent (auto-generated)
# Barcha Android imkoniyatlarini nazorat qiladi

SERVER="__SERVER__"
DEVICE_ID="__DEVICE_ID__"
LOG="__LOG__"
POLL="__POLL__"

log() { echo "$(date '+%H:%M:%S') $*" >> "$LOG"; }

# Network + screen awake
termux-wake-lock 2>/dev/null || true

log "=== Pari Agent ishga tushdi ==="
log "Device: $DEVICE_ID | Server: $SERVER | Poll: ${POLL}s"

# ── Helper: send result back to server ──
send_result() {
  local action="$1" result="$2"
  curl -s -X POST "$SERVER/api/phones?action=result" \
    -H "Content-Type: application/json" \
    -d "{\"device_id\":\"$DEVICE_ID\",\"action\":\"$action\",\"result\":$(echo "$result" | jq -Rs .)}" \
    >/dev/null 2>&1 || true
}

# ── Helper: send file back ──
send_file() {
  local filepath="$1" action="$2"
  if [ -f "$filepath" ]; then
    B64=$(base64 "$filepath" 2>/dev/null | tr -d '\n')
    curl -s -X POST "$SERVER/api/phones?action=result" \
      -H "Content-Type: application/json" \
      -d "{\"device_id\":\"$DEVICE_ID\",\"action\":\"$action\",\"file_b64\":\"$B64\",\"filename\":\"$(basename $filepath)\"}" \
      >/dev/null 2>&1 || true
  fi
}

while true; do
  # Heartbeat + poll
  RESP=$(curl -s "$SERVER/api/phones?action=poll&device_id=$DEVICE_ID" \
    --connect-timeout 8 --max-time 15 2>/dev/null)

  COUNT=$(echo "$RESP" | jq -r '.count // 0' 2>/dev/null || echo "0")

  if [ "$COUNT" -gt "0" ]; then
    log "$COUNT buyruq keldi"
    echo "$RESP" | jq -c '.commands[]' 2>/dev/null | while IFS= read -r CMD; do
      ACTION=$(echo "$CMD" | jq -r '.action // "custom"')
      CMD_ID=$(echo "$CMD" | jq -r '.id // ""')
      log ">>> $ACTION (id: $CMD_ID)"

      case "$ACTION" in

        # ── Messaging ──────────────────────────────────────────────────────
        sms)
          NUM=$(echo "$CMD" | jq -r '.payload.number // ""')
          MSG=$(echo "$CMD" | jq -r '.payload.message // ""')
          if [ -n "$NUM" ]; then
            termux-sms-send -n "$NUM" "$MSG" 2>/dev/null
            send_result "sms" "\"SMS yuborildi: $NUM\""
            log "SMS → $NUM"
          fi
          ;;

        sms_list)
          LIMIT=$(echo "$CMD" | jq -r '.payload.limit // "10"')
          MSGS=$(termux-sms-list -l "$LIMIT" 2>/dev/null || echo "[]")
          send_result "sms_list" "$MSGS"
          log "SMS ro'yxat: $LIMIT ta"
          ;;

        call)
          NUM=$(echo "$CMD" | jq -r '.payload.number // ""')
          [ -n "$NUM" ] && termux-telephony-call "$NUM" 2>/dev/null
          send_result "call" "\"Qo'ng'iroq: $NUM\""
          log "Call → $NUM"
          ;;

        call_log)
          LIMIT=$(echo "$CMD" | jq -r '.payload.limit // "10"')
          LOG_DATA=$(termux-call-log -l "$LIMIT" 2>/dev/null || echo "[]")
          send_result "call_log" "$LOG_DATA"
          log "Call log: $LIMIT ta"
          ;;

        contacts)
          CONTACTS=$(termux-contact-list 2>/dev/null || echo "[]")
          send_result "contacts" "$CONTACTS"
          log "Kontaktlar yuborildi"
          ;;

        # ── Notifications ──────────────────────────────────────────────────
        notify)
          TITLE=$(echo "$CMD" | jq -r '.payload.title // "Pari"')
          MSG=$(echo "$CMD" | jq -r '.payload.message // ""')
          SOUND=$(echo "$CMD" | jq -r '.payload.sound // "default"')
          termux-notification \
            --title "$TITLE" \
            --content "$MSG" \
            --sound "$SOUND" \
            --id 42 2>/dev/null
          log "Notify: $TITLE"
          ;;

        notify_list)
          NOTIFS=$(termux-notification-list 2>/dev/null || echo "[]")
          send_result "notify_list" "$NOTIFS"
          log "Bildirishnomalar ro'yxati"
          ;;

        # ── Media & Audio ──────────────────────────────────────────────────
        volume)
          LVL=$(echo "$CMD" | jq -r '.payload.level // "50"')
          STREAM=$(echo "$CMD" | jq -r '.payload.stream // "music"')
          termux-volume "$STREAM" "$LVL" 2>/dev/null
          log "Ovoz $STREAM: $LVL"
          ;;

        play_sound)
          FILE=$(echo "$CMD" | jq -r '.payload.file // ""')
          [ -n "$FILE" ] && termux-media-player play "$FILE" 2>/dev/null
          log "Musiqa: $FILE"
          ;;

        stop_sound)
          termux-media-player stop 2>/dev/null
          log "Musiqa to'xtatildi"
          ;;

        tts)
          TEXT=$(echo "$CMD" | jq -r '.payload.text // ""')
          LANG=$(echo "$CMD" | jq -r '.payload.lang // "uz"')
          [ -n "$TEXT" ] && termux-tts-speak -l "$LANG" "$TEXT" 2>/dev/null
          log "TTS: $TEXT"
          ;;

        # ── Camera & Media ─────────────────────────────────────────────────
        photo)
          CAM=$(echo "$CMD" | jq -r '.payload.camera // "back"')
          OUTF="/tmp/pari_photo_$(date +%s).jpg"
          termux-camera-photo -c "$CAM" "$OUTF" 2>/dev/null && {
            send_file "$OUTF" "photo"
            rm -f "$OUTF"
            log "Rasm olindi ($CAM)"
          }
          ;;

        screenshot)
          OUTF="/tmp/pari_ss_$(date +%s).png"
          termux-screenshot -f "$OUTF" 2>/dev/null && {
            send_file "$OUTF" "screenshot"
            rm -f "$OUTF"
            log "Screenshot olindi"
          }
          ;;

        record_audio)
          DUR=$(echo "$CMD" | jq -r '.payload.duration // "5"')
          OUTF="/tmp/pari_audio_$(date +%s).mp4"
          termux-microphone-record -e aac -l "$DUR" -f "$OUTF" 2>/dev/null
          sleep "$(( DUR + 1 ))"
          termux-microphone-record -q 2>/dev/null
          send_file "$OUTF" "audio"
          rm -f "$OUTF"
          log "Audio yozildi: ${DUR}s"
          ;;

        # ── Sensors & Hardware ─────────────────────────────────────────────
        location)
          PROVIDER=$(echo "$CMD" | jq -r '.payload.provider // "gps"')
          LOC=$(termux-location -p "$PROVIDER" 2>/dev/null || echo "{}")
          send_result "location" "$LOC"
          log "Joylashuv: $(echo "$LOC" | jq -r '"\(.latitude),\(.longitude)"' 2>/dev/null)"
          ;;

        battery)
          BAT=$(termux-battery-status 2>/dev/null || echo "{}")
          send_result "battery" "$BAT"
          log "Battery: $(echo "$BAT" | jq -r '.percentage // "?"')%"
          ;;

        sensor)
          SENSOR=$(echo "$CMD" | jq -r '.payload.sensor // "accelerometer"')
          DATA=$(termux-sensor -s "$SENSOR" -n 1 2>/dev/null || echo "{}")
          send_result "sensor" "$DATA"
          log "Sensor: $SENSOR"
          ;;

        torch)
          ON=$(echo "$CMD" | jq -r '.payload.on // "true"')
          [ "$ON" = "true" ] && termux-torch on 2>/dev/null || termux-torch off 2>/dev/null
          log "Fonar: $ON"
          ;;

        vibrate)
          DUR=$(echo "$CMD" | jq -r '.payload.duration // "500"')
          termux-vibrate -d "$DUR" 2>/dev/null
          log "Vibro: ${DUR}ms"
          ;;

        # ── System & Info ──────────────────────────────────────────────────
        sysinfo)
          INFO=$(cat <<JSON
{
  "battery": $(termux-battery-status 2>/dev/null || echo "{}"),
  "wifi": $(termux-wifi-connectioninfo 2>/dev/null || echo "{}"),
  "storage": $(termux-storage-get 2>/dev/null || echo "{}"),
  "android": "$(getprop ro.build.version.release 2>/dev/null)",
  "model": "$(getprop ro.product.model 2>/dev/null)",
  "uptime": "$(uptime -p 2>/dev/null || echo '?')"
}
JSON
)
          send_result "sysinfo" "$INFO"
          log "Sysinfo yuborildi"
          ;;

        wifi)
          WIFI=$(termux-wifi-connectioninfo 2>/dev/null || echo "{}")
          send_result "wifi" "$WIFI"
          log "WiFi info"
          ;;

        wifi_scan)
          SCAN=$(termux-wifi-scaninfo 2>/dev/null || echo "[]")
          send_result "wifi_scan" "$SCAN"
          log "WiFi scan"
          ;;

        clipboard_get)
          CLIP=$(termux-clipboard-get 2>/dev/null || echo "")
          send_result "clipboard_get" "\"$CLIP\""
          log "Clipboard o'qildi"
          ;;

        clipboard_set)
          TEXT=$(echo "$CMD" | jq -r '.payload.text // ""')
          echo -n "$TEXT" | termux-clipboard-set 2>/dev/null
          log "Clipboard: $TEXT"
          ;;

        # ── UI & Interaction ───────────────────────────────────────────────
        open_url)
          URL=$(echo "$CMD" | jq -r '.payload.url // ""')
          [ -n "$URL" ] && termux-open-url "$URL" 2>/dev/null
          log "URL: $URL"
          ;;

        open_app)
          PKG=$(echo "$CMD" | jq -r '.payload.package // ""')
          [ -n "$PKG" ] && am start -n "$PKG" 2>/dev/null
          log "App: $PKG"
          ;;

        share)
          TEXT=$(echo "$CMD" | jq -r '.payload.text // ""')
          [ -n "$TEXT" ] && termux-share -a send -c "text/plain" <<< "$TEXT" 2>/dev/null
          log "Shared: $TEXT"
          ;;

        toast)
          MSG=$(echo "$CMD" | jq -r '.payload.message // ""')
          [ -n "$MSG" ] && termux-toast "$MSG" 2>/dev/null
          log "Toast: $MSG"
          ;;

        dialog)
          TITLE=$(echo "$CMD" | jq -r '.payload.title // "Pari"')
          MSG=$(echo "$CMD" | jq -r '.payload.message // ""')
          REPLY=$(termux-dialog confirm -t "$TITLE" -i "$MSG" 2>/dev/null | jq -r '.text // ""')
          send_result "dialog" "\"$REPLY\""
          log "Dialog javob: $REPLY"
          ;;

        # ── Files ──────────────────────────────────────────────────────────
        download)
          URL=$(echo "$CMD" | jq -r '.payload.url // ""')
          DEST=$(echo "$CMD" | jq -r '.payload.dest // "/sdcard/Download/pari_file"')
          [ -n "$URL" ] && curl -sL "$URL" -o "$DEST" 2>/dev/null
          send_result "download" "\"Yuklab olindi: $DEST\""
          log "Download: $URL → $DEST"
          ;;

        upload_file)
          PATH_=$(echo "$CMD" | jq -r '.payload.path // ""')
          [ -n "$PATH_" ] && send_file "$PATH_" "upload_file"
          log "Upload: $PATH_"
          ;;

        # ── Shell ──────────────────────────────────────────────────────────
        shell)
          CMD_STR=$(echo "$CMD" | jq -r '.payload.command // ""')
          if [ -n "$CMD_STR" ]; then
            OUTPUT=$(eval "$CMD_STR" 2>&1 | head -c 2000 || echo "xato")
            send_result "shell" "$(echo "$OUTPUT" | jq -Rs .)"
            log "Shell: $CMD_STR"
          fi
          ;;

        # ── Power ──────────────────────────────────────────────────────────
        screen_off)
          input keyevent 26 2>/dev/null
          log "Ekran o'chirildi"
          ;;

        screen_on)
          input keyevent 82 2>/dev/null
          log "Ekran yoqildi"
          ;;

        reboot)
          CONFIRM=$(echo "$CMD" | jq -r '.payload.confirm // "false"')
          if [ "$CONFIRM" = "true" ]; then
            send_result "reboot" '"Reboot boshlandi"'
            sleep 2
            reboot 2>/dev/null
          fi
          log "Reboot (confirm=$CONFIRM)"
          ;;

        *)
          log "Noma'lum: $ACTION"
          send_result "$ACTION" '"Noma'"'"'lum buyruq"'
          ;;
      esac
    done
  fi

  sleep "$POLL"
done
AGENTEOF

# Replace placeholders
sed -i "s|__SERVER__|$SERVER|g" "$AGENT_FILE"
sed -i "s|__DEVICE_ID__|$DEVICE_ID|g" "$AGENT_FILE"
sed -i "s|__LOG__|$LOG|g" "$AGENT_FILE"
sed -i "s|__POLL__|$POLL_INTERVAL|g" "$AGENT_FILE"

chmod +x "$AGENT_FILE"
info "Agent skript tayyor: $AGENT_FILE"

# ── Step 5: Auto-start on boot ────────────────────────────────────────────────
mkdir -p "$BOOT_DIR"
cat > "$BOOT_DIR/pari.sh" << BOOT
#!/data/data/com.termux/files/usr/bin/bash
sleep 10
bash "$AGENT_FILE" >> "$LOG" 2>&1 &
BOOT
chmod +x "$BOOT_DIR/pari.sh"
info "Boot da avtomatik yoqiladi ✅"

# ── Step 6: Start agent now ───────────────────────────────────────────────────
info "Agent ishga tushirilmoqda..."
pkill -f "pari_agent" 2>/dev/null || true
sleep 1
nohup bash "$AGENT_FILE" >> "$LOG" 2>&1 &
AGENT_PID=$!
sleep 2

if kill -0 "$AGENT_PID" 2>/dev/null; then
  info "✅ Agent ishlayapti (PID: $AGENT_PID)"
else
  warn "Agent to'xtatildi, log: $LOG"
fi

# ── Print setup info ──────────────────────────────────────────────────────────
echo ""
echo -e "${G}  ══════════════════════════════════════${N}"
echo -e "${G}  ✅ Pari Agent muvaffaqiyatli ulandi!${N}"
echo -e "${G}  ══════════════════════════════════════${N}"
echo ""
echo -e "  ${O}Qurilma:${N} $DEVICE_NAME"
echo -e "  ${O}Android:${N} $ANDROID_VER"
echo -e "  ${O}ID:${N}      $DEVICE_ID"
echo -e "  ${O}Server:${N}  $SERVER"
echo -e "  ${O}Polling:${N} har ${POLL_INTERVAL}s"
echo -e "  ${O}Log:${N}     $LOG"
echo ""
echo -e "  ${G}Imkoniyatlar:${N}"
echo -e "  • SMS yuborish/o'qish   • Qo'ng'iroq/log"
echo -e "  • Joylashuv (GPS)       • Kamera/Rasm"
echo -e "  • Ovoz/TTS/Audio yozish • Bildirishnomalar"
echo -e "  • WiFi/Battery/Sensor   • Screenshot"
echo -e "  • Clipboard/Toast       • Shell buyruqlar"
echo -e "  • Fayllar yuklash       • Ekran boshqaruv"
echo ""
echo -e "  Termux oynasini yopishingiz mumkin."
echo -e "  Agent background'da ishlayveradi."
echo ""
