# Integratsiyalar tahlili (3 ta manba)

Siz yuborgan 3 ta vosita tahlil qilindi va Pari AI (Jarvis-ai) ga **amaliy** tarzda ulandi.

---

## 1. Ultimate Web Scraper (Chrome extension)

**Nima:** Brauzer kengaytmasi — List / Page / Image / Email / Shopify / Social Link / Page Text extractor.

**To‘g‘ridan-to‘g‘ri embed qilib bo‘lmaydi** (yopiq Chrome extension, serverda ishlamaydi).

**Loyihaga nima qo‘shildi** (`src/lib/tools.ts` agent tool lari):

| Tool | Vazifa |
|------|--------|
| `extract_emails` | Sahifadan email lar |
| `extract_social_links` | TG, IG, X, LinkedIn, YT, FB, TikTok linklari |
| `extract_images` | Rasm URL lari |
| `extract_page_text` | Title + meta + toza matn |
| `extract_list` | `<li>` / jadval ro‘yxatlari |
| `web_crawl` | Bir necha sahifa crawl |

Chat / agent orqali: *“shu saytdan emaillarni ol”* → tool chaqiriladi.

Shopify katalog to‘liq importi va cloud queue extension imkoniyatlari extension ichida qoladi; kerak bo‘lsa keyin alohida API wrapper yoziladi.

---

## 2. turbovec (Google TurboQuant)

**Repo:** https://github.com/RyanCodrai/turbovec  
**Nima:** Rust + Python vector index — 31 GB → ~4 GB, FAISS dan tezroq, train bosqichisiz.

**To‘g‘ridan-to‘g‘ri Next.js ga npm paket sifatida ulab bo‘lmaydi** (Python/Rust).

**Hozirgi holat:**
- Knowledge Hub = Supabase (`pari_knowledge`, text search).
- Tool: `knowledge_search` / `knowledge_save`.

**Kelajakdagi to‘liq RAG (ixtiyoriy Railway service):**

1. Alohida Python service (Railway):
   ```bash
   pip install turbovec numpy
   # FastAPI: /add, /search
   ```
2. Embedding: OpenAI / local (Ollama) → float32 vectors
3. Pari AI `knowledge_search` ni shu service ga yo‘naltirish

Hujjat: `docs/RAILWAY.md` + Ollama bilan birga ishlatish mumkin (air-gapped RAG).

---

## 3. AutoSocial Studio

**Repo:** https://github.com/Katzca/AutoSocial  
**Nima:** **Local** multi-account dashboard — TikTok / Instagram / YouTube, Playwright, navbat, scheduler, FFmpeg uniquify, yt-dlp.

**Muhim:** Hosted SaaS emas; brauzer session diskda; Railway da Playwright + login session ishonchli emas (anti-bot, 2FA, cookie).

**Loyihadagi SMM (allaqachon bor):**
- Telegram kanallar + draft / schedule / publish (`/api/smm/*`, `src/lib/smm-store.ts`)
- AI post generatsiya (`/api/smm/generate`)

**Tavsiya qilingan arxitektura:**

| Platforma | Qayerda |
|-----------|--------|
| Telegram kanallar | **Pari AI (Railway)** — bot API |
| TikTok / Instagram / YouTube short | **Local AutoSocial** (kompyuteringizda) |
| Kontent yozish | Pari AI chat / `/api/smm/generate` → matnni AutoSocial queue ga qo‘yasiz |

Ya’ni: Pari AI **kontent + Telegram**; AutoSocial **local video post**.

---

## Qisqa xulosa

| Manba | Integratsiya turi |
|-------|-------------------|
| Ultimate Web Scraper | ✅ Agent tool lari (email, social, image, text, list) |
| turbovec | 📋 Optional Python sidecar (keyinroq) |
| AutoSocial | 📋 Local juftlik; SMM Telegram Railway da |

Redeploy dan keyin agent yangi tool larni ko‘radi.
