<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

<!-- BEGIN:design-philosophy -->
# Design Philosophy — Pari AI

Never design for screenshots. Design for production. Every screen should look like it belongs to a shipping product with real users, not a concept or mockup.

**Never**: Dribbble-style UI, gaming HUDs, cyberpunk/futuristic effects, decorative glows, glassmorphism-for-its-own-sake, cartoon UI.

**Always think like**: Linear, Stripe, Notion, Vercel, Raycast, Anthropic — restrained, confident, functional.

**Rules**:
- Function over decoration — every element must justify its existence.
- Restrained color palettes; accent colors only when they carry meaning (current: Obsidian dark + Hermes-orange accent, #ff6a1a family). Don't reintroduce oversaturated or gradient-heavy UI without reason.
- 8px spacing rhythm, generous whitespace, consistent alignment.
- Typography: clear hierarchy, comfortable line-height, no novelty fonts.
- Motion: fast, subtle, purposeful — never flashy or decorative.
- lucide-react icons only in the app UI — no raw emoji in rendered interface (emoji in Telegram bot chat text is fine, that's a different surface).
- Don't change existing screens' established look without a concrete reason — extend the system, don't redesign it on a whim.
- Every new component: reusable, typed, accessible (keyboard + contrast), no dead code, no magic numbers.
<!-- END:design-philosophy -->
