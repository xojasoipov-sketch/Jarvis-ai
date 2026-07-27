# Hermes + Obsidian + Telegram + Ovoz + Kompyuter/Telefon — "Jarvis" loyihasi

To'liq shaxsiy AI-yordamchi:

- **Miya**: Hermes Agent (Claude API orqali)
- **Xotira**: Obsidian vault (MCP orqali)
- **Ovoz**: lokal STT/TTS (bepul), pullik xizmatlar zaxira sifatida
- **Kod yozish**: built-in terminal + fayl tahrirlash (Claude Code/Cursor/Codex kabi)
- **Kompyuter boshqaruvi**: built-in `computer_use` (macOS/Windows/Linux)
- **Telefon boshqaruvi**: `mobile-mcp` (Android + iOS)
- **Interfeys**: Telegram bot

```
Siz (Telegram / ovozli xabar)
      │
      ▼
Hermes Agent (gateway + agent loop)
      │
      ├── MCP: Obsidian        (xotira)
      ├── MCP: mobile-mcp      (telefon)
      ├── built-in: computer_use (kompyuter)
      ├── built-in: terminal/fayl (kod yozish)
      ├── STT: faster-whisper (lokal) → Groq/OpenAI (zaxira)
      ├── TTS: Piper (lokal) → ElevenLabs (zaxira/sifat)
      └── LLM: Claude API
```

> ⚠️ **Xavfsizlik**: `.env` fayli hech qachon GitHub'ga push qilinmaydi
> (`.gitignore`da bloklangan). Agar biror token allaqachon oshkor bo'lgan
> bo'lsa (masalan, chatda yozilgan) — uni darhol bekor qilib (`/revoke`),
> yangisini oling.
>
> ⚠️ **Bu Jarvis kompyuteringiz va telefoningizni haqiqatan ham boshqaradi.**
> Faqat o'zingizga ishonch bildirgan Telegram foydalanuvchisiga ruxsat
> bering (`TELEGRAM_ALLOWED_USERS`), va halokatli amallar (fayl o'chirish,
> to'lov qilish, xabar yuborish) uchun avval tasdiqlashni so'rashini
> `AGENTS.md`da belgilang (7-bo'limga qarang).

---

## 1. Talablar

- Python 3.10+ va [uv](https://github.com/astral-sh/uv)
- Node.js 18+ (Obsidian MCP, mobile-mcp `npx` orqali ishga tushadi)
- `ffmpeg` (ovozli xabarlar uchun)
- Telegram akkaunt
- (Telefon boshqaruvi uchun) Android SDK platform-tools yoki go-ios (iOS)

## 2. Hermes Agent'ni o'rnatish

```bash
curl -fsSL https://hermes-agent.nousresearch.com/install.sh | bash
```

Messaging (Telegram) va ovoz uchun qo'shimcha bog'liqliklar:

```bash
cd ~/.hermes/hermes-agent
uv pip install -e ".[messaging]"
pip install faster-whisper piper-tts --break-system-packages
```

## 3. LLM provayderni ulash

```bash
hermes setup --portal
# yoki qo'lda: ~/.hermes/.env fayliga ANTHROPIC_API_KEY qo'shing
```

## 4. Bu repo fayllarini joylashtirish

**Avtomatik (tavsiya etiladi):**

```bash
chmod +x setup.sh
./setup.sh
```

Skript `config.yaml` va `AGENTS.md`ni joylashtiradi, mavjud sozlamalarni
zaxiralaydi, `.env` shablonini yaratadi (agar hali bo'lmasa) va kerakli
dasturlar (`node`, `ffmpeg`, `adb`, `go-ios`) o'rnatilganini tekshiradi.
Hech qanday tokenni o'zi to'ldirmaydi — buni siz qo'lda qilasiz.

**Qo'lda:**

```bash
mkdir -p ~/.hermes
cp config/config.yaml ~/.hermes/config.yaml
cp config/AGENTS.md ~/.hermes/AGENTS.md
cp .env.example ~/.hermes/.env
nano ~/.hermes/.env   # haqiqiy qiymatlarni kiriting
```

| O'zgaruvchi | Qayerdan olinadi |
|---|---|
| `TELEGRAM_BOT_TOKEN` | Telegram `@BotFather` → `/newbot` |
| `TELEGRAM_ALLOWED_USERS` | Telegram `@userinfobot` → sizning raqamli ID'ingiz |
| `OBSIDIAN_VAULT_PATH` | Obsidian vault to'liq yo'li |
| `ANTHROPIC_API_KEY` | Claude API kaliti (console.anthropic.com) |
| `GROQ_API_KEY` (ixtiyoriy) | STT zaxira, groq.com — bepul tarif |
| `ELEVENLABS_API_KEY` (ixtiyoriy) | Sifatli TTS, elevenlabs.io |

## 5. Ovoz (STT/TTS) — lokal, keyin pullik zaxira

Hech narsa sozlamasangiz ham ishlaydi ("zero config"):

- **STT**: `faster-whisper` o'rnatilgan bo'lsa, avtomatik lokal ishlaydi
  (birinchi ishlatishda ~150MB model yuklab olinadi). Agar lokal xato
  bersa yoki o'chirilgan bo'lsa, `.env`dagi `GROQ_API_KEY` orqali bulutga
  o'tadi.
- **TTS**: `config.yaml`da `tts.provider: piper` — to'liq offline. Sifatli
  ovoz kerak bo'lsa (`ELEVENLABS_API_KEY` borligiga ishonch hosil qilib)
  `tts.provider: elevenlabs`ga o'zgartiring.

Tekshirish:

```bash
hermes --tui
# mikrofon tugmasini bosib gapiring, Jarvis lokal ovoz bilan javob beradi
```

## 6. Kompyuterni boshqarish (Claude Code/Cursor/Codex kabi + computer_use)

**Kod yozish** — hech narsa o'rnatish shart emas, built-in:

```
Jarvis, /home/user/projects/myapp papkasida yangi FastAPI loyiha yarat,
testlarni yoz va ishga tushir.
```

**Ekranni ko'rish va sichqoncha/klaviatura boshqaruvi** yoqish:

```bash
hermes tools
# → Computer Use → Enable
```

- **macOS**: Tizim sozlamalari → Maxfiylik → Accessibility + Screen
  Recording ruxsatlarini bering.
- **Windows/Linux**: qo'shimcha ruxsat so'ralmaydi, lekin birinchi
  ishga tushirishda `cua-driver` avtomatik o'rnatiladi.

Sinash:

```
Jarvis, brauzerni och va "OpenAI" saytiga kirib, bosh sahifa skrinshotini
menga yubor.
```

> Bu vositalar sizning **haqiqiy** kursoringizni siljitmaydi — orqa fonda
> alohida "virtual kursor" bilan ishlaydi, shuning uchun siz shu paytda
> boshqa ish qilishingiz mumkin.

## 7. Telefonni boshqarish (Android + iOS)

`config.yaml`da `mobile` MCP allaqachon qo'shilgan. Faqat quyidagilarni
sozlang:

**Android:**
```bash
# Android SDK platform-tools o'rnating, keyin:
adb devices   # telefon "device" holatida ko'rinishi kerak
# Telefonda: Sozlamalar → Dasturchi uchun → USB debugging — yoqing
```

**iOS (jismoniy qurilma):**
```bash
# go-ios o'rnating: https://github.com/danielpaulus/go-ios
npm install -g go-ios
ios list   # qurilma ko'rinishi kerak
```

Sinash:

```
Jarvis, telefonimda Telegram ilovasini och va oxirgi xabarni o'qib ber.
```

## 8. Xotira (Obsidian) va coding'ni birlashtirib ishlatish

```
Jarvis, "auth-loyiha" nomli qaydimni Obsidian'dan o'qi, undagi
talablarga asosan kod yoz va natijani xuddi shu qaydga qo'sh.
```

## 9. Telegram gateway'ni ishga tushirish

```bash
hermes gateway setup      # Telegram tanlang
hermes gateway start
```

## 10. AGENTS.md — Jarvisga rol berish (tavsiya etiladi)

`config/AGENTS.md` fayli repo ichida allaqachon tayyor — Jarvisga xotira,
kompyuter/telefon boshqaruvi, kod yozish va xavfsizlik bo'yicha rol beradi
(masalan, halokatli amallar oldidan tasdiqlash so'rash). `setup.sh` uni
avtomatik `~/.hermes/AGENTS.md`ga joylashtiradi. O'zingizga mos ravishda
tahrirlashdan tortinmang.

## 11. GitHub'ga push qilishdan oldin tekshirish ro'yxati

- [ ] `.env` fayli repo ichida emas (faqat `.env.example` bor)
- [ ] `git status` da `.env` ko'rinmayapti
- [ ] Kod ichida hech qanday token qattiq yozilmagan
- [ ] Token birov ko'rgan bo'lsa — BotFather'da `/revoke` qilingan

```bash
git init
git add .
git status   # .env yo'qligiga ishonch hosil qiling
git commit -m "Hermes Jarvis: Obsidian + Telegram + ovoz + kompyuter/telefon"
git remote add origin https://github.com/<username>/<repo>.git
git push -u origin main
```

## 12. Boshqa qurilmada GitHub URL orqali ishlatish

```bash
git clone https://github.com/<username>/<repo>.git
cd <repo>
cp .env.example ~/.hermes/.env   # qiymatlarni to'ldiring
cp config/config.yaml ~/.hermes/config.yaml
hermes gateway start
```

---

## Foydali havolalar

- Hermes hujjatlari: https://hermes-agent.nousresearch.com/docs/
- Hermes GitHub: https://github.com/NousResearch/hermes-agent
- Obsidian MCP: https://github.com/StevenStavrakis/obsidian-mcp
- Computer Use (built-in): https://hermes-agent.nousresearch.com/docs/user-guide/features/computer-use
- Voice/TTS: https://hermes-agent.nousresearch.com/docs/user-guide/features/voice-mode
- Mobile MCP: https://github.com/mobile-next/mobile-mcp
- Telegram sozlash: https://hermes-agent.nousresearch.com/docs/user-guide/messaging/telegram/
