# Railway deploy (asosiy platforma)

Pari AI **Railway**da ishlash uchun sozlangan. `railway.toml` + `nixpacks.toml` bor.

## 1. Asosiy app (Next.js)

1. [railway.app](https://railway.app) → **New Project** → **Deploy from GitHub** → `Jarvis-ai`
2. Root / build: avtomatik (Nixpacks)
3. **Variables** — quyidagilarni qo‘ying:

```
# Kamida bitta LLM
GEMINI_API_KEY=
# yoki GROQ_API_KEY= / OPENAI_API_KEY= / OPENROUTER_API_KEY=

# Supabase (ixtiyoriy)
SUPABASE_URL=
SUPABASE_SERVICE_ROLE_KEY=

# Telegram
TELEGRAM_BOT_TOKEN=
TELEGRAM_ALLOWED_USERS=

# Ixtiyoriy
OPENROUTER_API_KEY=
DEEPSEEK_API_KEY=
CEREBRAS_API_KEY=
ELEVENLABS_API_KEY=
MCP_TOOLS_JSON=
```

4. Deploy → public domain oling (`xxx.up.railway.app`)

### Telegram webhook

Deploy dan keyin:

```bash
curl "https://api.telegram.org/bot<TOKEN>/setWebhook?url=https://YOUR_APP.up.railway.app/api/telegram"
```

Yoki Settings → Telegram setup API orqali.

## 2. Ollama (local LLM) — ixtiyoriy, lekin tavsiya

1. Shu project ichida yangi service: **Deploy Ollama** template yoki `ollama/ollama` image
2. Volume: `/root/.ollama` (model saqlansin)
3. Ollama env:

```
OLLAMA_HOST=0.0.0.0:11434
```

4. Model tortish (bir marta, Ollama service shell da):

```bash
ollama pull llama3.2
```

5. **Pari AI service** Variables:

**Variant A — service nomi (eng oson):**
```
OLLAMA_SERVICE=ollama
OLLAMA_MODEL=llama3.2
```

**Variant B — to‘liq private URL:**
```
LOCAL_LLM_URL=http://ollama.railway.internal:11434/v1/chat/completions
LOCAL_LLM_MODEL=llama3.2
LOCAL_LLM_KEY=ollama
```

Private network (`*.railway.internal`) faqat **bir xil Railway project/environment** ichida ishlaydi.

## 3. Provider tartibi

1. **local** (Ollama) — sozlangan bo‘lsa
2. Pollinations (bepul)
3. Groq, Cerebras, OpenRouter, …
4. OpenAI

Local ishlamasa avtomatik cloud’ga o‘tadi.

## 4. MCP tool’lar

```
MCP_TOOLS_JSON=[{"name":"mytool","description":"...","url":"https://my-tool.up.railway.app/run"}]
```

Tekshirish: `GET /api/mcp`

## 5. Experience memory (Supabase)

```sql
create table if not exists pari_traces (
  id text primary key,
  task text,
  task_norm text,
  steps jsonb,
  answer text,
  success boolean default true,
  source text,
  created_at timestamptz default now()
);
```

Jadval bo‘lmasa in-memory ishlaydi (redeployda tozalanadi).

## 6. Build / Start

| | |
|--|--|
| Builder | Nixpacks |
| Install | `npm ci` yoki `npm install --include=dev` |
| Build | `npm run build` |
| Start | `npm start` (`next start`, `PORT` avtomatik) |
| Healthcheck | `GET /` |

## 7. Tekshirish

```bash
# Providerlar
curl https://YOUR_APP.up.railway.app/api/hermes

# ReAct + local
curl -X POST https://YOUR_APP.up.railway.app/api/react \
  -H 'Content-Type: application/json' \
  -d '{"task":"2+2 nechchi?"}'

# MCP
curl https://YOUR_APP.up.railway.app/api/mcp
```

## 8. Vercel dan chiqish

Agar avval Vercel da ishlagan bo‘lsangiz:

1. Vercel project ni o‘chiring yoki disconnect qiling
2. GitHub Actions dagi eski Vercel deploy workflow o‘chirilgan / almashtirilgan
3. Barcha env varlarni Railway Variables ga ko‘chiring
4. Telegram webhook URL ni yangi Railway domain ga o‘zgartiring
