# Pari AI (Jarvis-ai)

Next.js asosidagi shaxsiy AI assistant — chat, Telegram bot, knowledge base, SMM, business tools, local LLM (Ollama) va boshqalar.

**Asosiy deploy platformasi: [Railway](https://railway.app)**

## Tez start (local)

```bash
npm install
cp .env.example .env.local
# .env.local ga kalitlarni yozing
npm run dev
```

http://localhost:3000

## Railway ga deploy

1. [Railway](https://railway.app) → **New Project** → **Deploy from GitHub** → `xojasoipov-sketch/Jarvis-ai`
2. Root directory: (bo‘sh qoldiring)
3. Build: `nixpacks` avtomatik (yoki `railway.toml` / `nixpacks.toml`)
4. **Variables** ga `.env.example` dagi kalitlarni qo‘ying (kamida bitta LLM kaliti)
5. Deploy tugagach domain beriladi: `https://xxx.up.railway.app`

Batafsil: **[docs/RAILWAY.md](docs/RAILWAY.md)**

### Ollama (local LLM) — ixtiyoriy

Shu project ichida alohida service sifatida Ollama qo‘shing, so‘ng:

```
OLLAMA_SERVICE=ollama
OLLAMA_MODEL=llama3.2
```

Provider tartibi: **local → Pollinations → Groq / Cerebras / OpenRouter → … → OpenAI**

## Asosiy endpointlar

| Endpoint | Vazifa |
|----------|--------|
| `GET /` | Dashboard |
| `POST /api/chat` | Chat |
| `POST /api/telegram` | Telegram webhook |
| `GET /api/hermes` | Provider holati |
| `GET /api/mcp` | MCP tools ro‘yxati |
| `POST /api/react` | ReAct agent |

## Stack

- **Next.js 16** + React 19 + TypeScript
- Tailwind CSS, Framer Motion, Lucide icons
- Supabase (ixtiyoriy DB)
- Sentry (ixtiyoriy)
- Multi-provider LLM (Gemini, Groq, OpenRouter, Ollama, …)

## Scripts

```bash
npm run dev      # development
npm run build    # production build
npm start        # production server (Railway shu bilan ishga tushadi)
npm run lint
```

## License

Private / personal use.
