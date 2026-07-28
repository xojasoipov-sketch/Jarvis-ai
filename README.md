# Jarvis — Hermes + Obsidian + Telegram (Railway'da, kompyutersiz)

Bulutda 24/7 ishlaydigan shaxsiy AI-yordamchi. Sizda kompyuter yo'qligi
sababli hammasi Railway'ning bulut serverida ishlaydi, siz faqat
Telegram orqali muloqot qilasiz.

```
Siz (Telegram, telefondan)
      │
      ▼
Railway bulut serveri
      │
      ├── Hermes Agent (gateway + agent loop)
      ├── Obsidian-uslubidagi vault (serverning o'z diskida)
      ├── STT: faster-whisper (lokal, server ichida)
      ├── TTS: Piper (lokal, server ichida)
      ├── Terminal/kod yozish (Jarvisning o'z konteynerida)
      └── LLM: OpenRouter → Gemini → Mistral → Cerebras (zaxira zanjiri)
```

**Nima ishlaydi, nima ishlamaydi:**

| Funksiya | Holat |
|---|---|
| Telegram orqali suhbat | ✅ |
| Obsidian-uslubidagi xotira (vault) | ✅ (serverda saqlanadi) |
| Kod yozish/ishga tushirish | ✅ (Jarvisning o'z konteynerida) |
| GitHub (repo, push, PR, issue) | ✅ |
| Render (deploy, loglar, boshqaruv) | ✅ |
| Supabase (baza, auth, storage) | ✅ |
| PostgreSQL (to'g'ridan-to'g'ri SQL) | ✅ |
| Brauzer (Playwright — sahifa ochish, test) | ✅ |
| Ovozli xabar (STT/TTS) | ✅ |
| Sizning shaxsiy kompyuteringizni boshqarish | ❌ (kompyuter yo'q) |
| Sizning telefoningizni masofadan boshqarish | ❌ (texnik jihatdan bulutdan imkonsiz — pastga qarang) |

> Telefonni masofadan boshqarish (ilova ochish, tugma bosish) uchun
> boshqaruvchi dastur **jismonan** telefon bilan bir tarmoqda yoki unga
> USB orqali ulangan bo'lishi kerak. Bulutdagi server buni qila olmaydi.
> Agar kelajakda doim-onlayn turadigan qo'shimcha Android qurilma
> (hatto eski telefon) topsangiz, shu funksiyani qo'shib berish mumkin.

---

## Sizga qolgan yagona ishlar (men bajara olmaydigan qismlar)

Men kodni, konfiguratsiyani va hujjatlarni to'liq tayyorlab qo'ydim.
Qolgan ishlar — barchasi **hisob yaratish / tugma bosish** turidagi
amallar, ularni faqat siz bajara olasiz (na tashqi tarmoqqa ulanishim,
na sizning hisoblaringizga kirish huquqim bor):

### A. Kalitlarni olish (har biri bepul ro'yxatdan o'tish talab qiladi)
- [ ] Telegram bot: `@BotFather` → `/newbot` → tokenni saqlang
- [ ] Telegram user ID: `@userinfobot`ga yozing → raqamni saqlang
- [ ] OpenRouter kalit: https://openrouter.ai/keys
- [ ] Gemini kalit: https://aistudio.google.com/apikey
- [ ] Mistral kalit: https://console.mistral.ai
- [ ] Cerebras kalit: https://cloud.cerebras.ai
- [ ] GitHub token: Settings → Developer settings → Personal access tokens
      → Fine-grained token → kerakli repo(lar)ga yozish huquqi bilan
- [ ] Render kalit: dashboard.render.com → Account Settings → API Keys
- [ ] Supabase token: supabase.com/dashboard/account/tokens
- [ ] PostgreSQL ulanish satri: `DATABASE_URL` (Supabase/Render loyihangizdan
      olinadi — "Connection string" bo'limida)

> Oxirgi to'rttasi (GitHub/Render/Supabase/Postgres) ixtiyoriy — agar hozircha
> kerak bo'lmasa, `.env`da bo'sh qoldirsangiz ham bo'ladi, Jarvis shunchaki
> o'sha vositalarsiz ishlayveradi. Keyin xohlagan payt qo'shishingiz mumkin.

### B. GitHub'ga joylashtirish
- [ ] `Jarvis-ai` repo'ingizga shu papkadagi barcha fayllarni yuklang
      (GitHub sahifasida "Add file → Upload files" — telefon brauzeridan
      ham bo'ladi, terminal shart emas)

### C. Railway'da ishga tushirish
- [ ] https://railway.com — GitHub akkauntingiz bilan ro'yxatdan o'ting
- [ ] "New Project" → "Deploy from GitHub repo" → `Jarvis-ai`ni tanlang
- [ ] "Variables" bo'limiga A-qadamdagi barcha kalitlarni kiriting
      (`.env.example` faylida ro'yxati bor)
- [ ] "Deploy" bosing

Shu uchta blok — atigi hisob ochish va kalit/token nusxalash. Boshqa
hech narsa (kod, konfiguratsiya, terminal buyruqlari) kerak emas.

---

## Fayllar tuzilishi

```
Jarvis-ai/
├── README.md          — shu fayl
├── .env.example        — Railway "Variables"ga kiritiladigan kalitlar ro'yxati
├── .gitignore           — maxfiy fayllarni himoya qiladi
├── setup.sh             — lokal o'rnatish uchun (ixtiyoriy)
└── config/
    ├── config.yaml      — Obsidian, STT/TTS, LLM providerlar, terminal, Telegram + MCP
    └── AGENTS.md         — Jarvisning rol va xavfsizlik qoidalari
```

## Tekshirish

Deploy tugagach, Telegram'da botingizga yozing:

```
Salom! O'zingni tanishtir va nima qila olishingni ayt.
```

```
Vault'imga "Birinchi qayd" nomli yangi fayl yarat va unga "Jarvis ishga
tushdi" deb yoz.
```

Agar bot javob bermasa — Railway dashboard'idagi "Deployments" →
"View Logs" bo'limidan xato matnini nusxalab shu yerga tashlang, birga
tuzatamiz.

## Xavfsizlik eslatmasi

- `.env` fayli hech qachon GitHub'ga push qilinmaydi — barcha kalitlar
  faqat Railway "Variables" bo'limida saqlanadi.
- `TELEGRAM_ALLOWED_USERS`ga faqat o'zingizning ID'ingizni qoldiring —
  aks holda botga istalgan kim yozib, buyruq bera oladi.
- Agar biror token oshkor bo'lib qolgan bo'lsa (masalan chatda yozilgan),
  darhol shu xizmatning saytida uni bekor qilib (`revoke`), yangisini
  oling.
- ⚠️ **GitHub/Render/Supabase/PostgreSQL kalitlari kuchli huquqlarga ega**
  — Jarvis endi repo o'chira, xizmatni to'xtata, bazadan yozuv o'chira
  oladi. `config/AGENTS.md`da halokatli amallar oldidan tasdiqlash
  so'rash qoidasi yozilgan, lekin baribir GitHub'da fine-grained token
  yaratganda faqat KERAKLI repo(lar)ga cheklangan huquq bering (barcha
  repolaringizga emas), va imkon qadar production emas, alohida
  test/staging Supabase loyihasini ulang.

## Foydali havolalar

- Hermes hujjatlari: https://hermes-agent.nousresearch.com/docs/
- Railway Hermes shabloni: https://railway.com/deploy/hermes-agent-1
- Obsidian MCP: https://github.com/StevenStavrakis/obsidian-mcp
