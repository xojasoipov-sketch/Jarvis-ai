// One-time script: write Sadi profile to GitHub vault
// Run: npx tsx scripts/write-vault-profile.ts

const CONTENT = `# Sadi — Shaxsiy Profil

## Asosiy ma'lumotlar
- **Ism**: Sadi (Xojasoipov)
- **Email**: xojasoipov@gmail.com
- **Til**: O'zbek (asosiy), Rus
- **Joylashuv**: O'zbekiston

## Kompaniya va loyihalar
- **Kompaniya**: Second Brine
- **Faoliyat**: Brend dizayn, Veb-sayt, Marketing, Mobil ilova
- **Mijozlar**: bor (SMM, kontent yaratish)

## Texnik stack
- Vercel (Next.js deployment)
- Supabase (PostgreSQL)
- Telegram bot
- GitHub (xojasoipov-sketch)

## Pari AI loyihasi
- Sadining shaxsiy AI yordamchisi
- Ovozli interfeys (O'zbek tili)
- Butterfly neural network vizualizatsiya
- GitHub vault (Obsidian uslubida)

## Ishchi uslubi
- Tez harakat qiladi
- Vizual natija muhim
- O'zbek tilida muloqot qiladi
- Mobil (iOS) dan ko'p foydalanadi

## Maqsad va qiziqishlar
- Loyihalar: Second Brine, Veb-sayt, Mobil ilova
- Vazifalar: Reja tuzish, Tadqiqot, Automatlashtirish
- Bilimlar: Materiallar, G'oyalar, Darslar
- Shaxsiy: Kunlik yozuvlar, Maqsadlar, Habits, Salomatlik

---
*Oxirgi yangilash: 2026-07-31*
`;

import { writeVaultFile } from "../src/lib/githubVault";

const ok = await writeVaultFile("vault/men-haqimda.md", CONTENT, "vault: Sadi profili");
console.log(ok ? "✅ Yozildi" : "❌ Xato");
