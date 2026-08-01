# Railway deploy + Local-first (Ollama)

Pari AI **Vercel** va **Railway**da ishlaydi. Local model (OpenJarvis local-first) uchun eng qulay joy — **Railway**.

## 1. Asosiy app (Next.js)

1. New Project → Deploy from GitHub → `Jarvis-ai`
2. Root / build: Next.js default
3. Variables — Vercel’dagi bilan bir xil kalitlarni qo‘ying:

```
GROQ_API_KEY=
OPENAI_API_KEY=
SUPABASE_URL=
SUPABASE_SERVICE_ROLE_KEY=
# ixtiyoriy
OPENROUTER_API_KEY=
DEEPSEEK_API_KEY=
CEREBRAS_API_KEY=
MCP_TOOLS_JSON=
```

## 2. Ollama (local LLM) — ixtiyoriy, lekin tavsiya

1. Shu project ichida yangi service: **Deploy Ollama** template yoki `ollama/ollama` image
2. Volume: `/root/.ollama` (model saqlansin)
3. Ollama env:

```
OLLAMA_HOST=0.0.0.0:11434
```

4. Model tortish (bir marta):

```bash
ollama pull llama3.2
# yoki
curl -X POST http://localhost:11434/api/pull -d '{"name":"llama3.2"}'
```

5. **Pari AI service** Variables:

**Variant A — service nomi orqali (eng oson):**
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

**Variant C — public Ollama URL** (tavsiya etilmaydi):
```
OLLAMA_BASE_URL=https://your-ollama.up.railway.app
```

Private network (`*.railway.internal`) faqat **bir xil Railway project/environment** ichida ishlaydi.

## 3. Provider tartibi

1. **local** (Ollama) — sozlangan bo‘lsa
2. Pollinations (bepul)
3. Groq, Cerebras, OpenRouter, …
4. OpenAI

Local ishlamasa avtomatik cloud’ga o‘tadi — hech narsa buzilmaydi.

## 4. MCP tool’lar (Railway yoki Vercel)

```
MCP_TOOLS_JSON=[{"name":"mytool","description":"...","url":"https://my-tool.up.railway.app/run"}]
```

Tekshirish: `GET /api/mcp`

## 5. Experience memory

Supabase’da (ixtiyoriy):

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

Jadval bo‘lmasa ham in-memory ishlaydi (redeployda tozalanadi).

## 6. Vercel + Railway birga

| Vazifa | Qayerda |
|--------|---------|
| Frontend / asosiy UI | Vercel yoki Railway |
| Local LLM (Ollama) | **Railway** (RAM kerak) |
| Vercel’dan local model | Ollama’ni **public** URL qilib `LOCAL_LLM_URL` qo‘ying |
| Railway app → Ollama | `OLLAMA_SERVICE=ollama` (private, tez, bepul ichki trafik) |

## 7. Tekshirish

```bash
# Providerlar
curl https://YOUR_APP/api/hermes

# ReAct + local
curl -X POST https://YOUR_APP/api/react \
  -H 'Content-Type: application/json' \
  -d '{"task":"2+2 nechchi?"}'

# MCP ro'yxat
curl https://YOUR_APP/api/mcp
```
