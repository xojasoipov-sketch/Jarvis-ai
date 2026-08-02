# Railway deploy (auto from main)

## Branch

1. Railway → Service → **Settings** → **Source**
2. Branch: **`main`** (tavsiya)
3. **Wait for CI** / auto-deploy: **ON**

Har safar `main` ga push bo‘lganda Railway avtomatik yangi build oladi.

Agar hozir `claude/jarvis-ai-loyham-analiz-tjuvhq` ishlatilsa — o‘sha branchni ham auto-deploy qilish mumkin, lekin ishlab chiqarish uchun **main** yaxshiroq.

## Tekshirish

Deploy Success bo‘lgach:

- `/pari` — kapalak miya (asosiy)
- `/api/mcp` — tool lar
- `/api/brain/status` — ulanishlar
- `/api/connectors/status` — env skaner

## Obsidian / Second Brain

Railway Variables:

```
GITHUB_TOKEN=ghp_...
GITHUB_VAULT_REPO=xojasoipov-sketch/Jarvis-ai
GITHUB_VAULT_PATH=vault
GITHUB_VAULT_BRANCH=main
```

Eslatmalar `vault/` papkasida saqlanadi. Chat/tool lar: `vault_read`, `vault_write`, `knowledge_search`.
