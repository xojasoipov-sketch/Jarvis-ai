"use client";

import {
  SADIPRIME,
  DIRECTIONS,
  SERVICES,
  PROJECTS,
  PROCESS,
  TECH,
  STATS,
} from "@/lib/sadiprime";

export default function PortfolioPage() {
  return (
    <div className="min-h-screen bg-white text-slate-900">
      {/* Hero */}
      <header className="relative overflow-hidden border-b border-red-100 bg-gradient-to-b from-red-50/80 to-white px-4 pb-10 pt-6">
        <div className="mx-auto max-w-lg">
          <div className="mb-6 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-red-600 text-sm font-black text-white">
                SP
              </div>
              <span className="text-lg font-bold tracking-tight text-red-600">{SADIPRIME.brand}</span>
            </div>
            <a
              href={`https://t.me/${SADIPRIME.telegram}`}
              className="rounded-full bg-red-600 px-4 py-2 text-xs font-semibold text-white shadow-md shadow-red-200"
            >
              Bog'lanish
            </a>
          </div>

          <p className="mb-2 text-xs font-medium uppercase tracking-wider text-red-500">
            Raqamli yechimlar agentligi
          </p>
          <h1 className="mb-3 text-3xl font-black leading-tight tracking-tight">
            Biz g&apos;oyalarni{" "}
            <span className="text-red-600">raqamli muvaffaqiyatga</span> aylantiramiz
          </h1>
          <p className="mb-6 text-sm leading-relaxed text-slate-600">{SADIPRIME.description}</p>

          <div className="flex flex-wrap gap-2">
            <a
              href="#xizmatlar"
              className="rounded-full bg-red-600 px-5 py-2.5 text-sm font-semibold text-white"
            >
              Xizmatlar
            </a>
            <a
              href="#loyihalar"
              className="rounded-full border border-slate-200 bg-white px-5 py-2.5 text-sm font-semibold text-slate-800"
            >
              Portfolio
            </a>
          </div>

          <div className="mt-8 grid grid-cols-3 gap-2 sm:grid-cols-5">
            {STATS.map((s) => (
              <div
                key={s.label}
                className="rounded-2xl border border-slate-100 bg-white/90 p-3 text-center shadow-sm"
              >
                <div className="text-lg font-black text-red-600">{s.value}</div>
                <div className="text-[10px] leading-tight text-slate-500">{s.label}</div>
              </div>
            ))}
          </div>
        </div>
      </header>

      {/* Directions */}
      <section className="mx-auto max-w-lg px-4 py-10">
        <h2 className="mb-4 text-xl font-bold">Bizning yo&apos;nalishimiz</h2>
        <div className="grid grid-cols-2 gap-3">
          {DIRECTIONS.map((d) => (
            <div
              key={d.title}
              className="rounded-2xl border border-slate-100 bg-slate-50/80 p-4 text-sm font-medium"
            >
              <span className="mb-1 block text-xl">{d.icon}</span>
              {d.title}
            </div>
          ))}
        </div>
      </section>

      {/* Services */}
      <section id="xizmatlar" className="border-t border-slate-100 bg-slate-50/50 px-4 py-10">
        <div className="mx-auto max-w-lg">
          <h2 className="mb-1 text-xl font-bold">Xizmatlar</h2>
          <p className="mb-5 text-sm text-slate-500">Biznesingiz uchun zamonaviy raqamli yechimlar</p>
          <div className="space-y-3">
            {SERVICES.map((s) => (
              <div
                key={s.title}
                className="flex gap-3 rounded-2xl border border-slate-100 bg-white p-4 shadow-sm"
              >
                <span className="text-2xl">{s.icon}</span>
                <div>
                  <div className="font-semibold">{s.title}</div>
                  <div className="text-sm text-slate-500">{s.desc}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Projects */}
      <section id="loyihalar" className="mx-auto max-w-lg px-4 py-10">
        <h2 className="mb-1 text-xl font-bold">Tanlangan loyihalar</h2>
        <p className="mb-5 text-sm text-slate-500">Har bir loyiha — sifat va natija</p>
        <div className="space-y-4">
          {PROJECTS.map((p) => (
            <article
              key={p.id}
              className="overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-sm"
            >
              <div className="border-b border-slate-50 bg-gradient-to-r from-red-600 to-red-500 px-4 py-3 text-white">
                <div className="text-lg font-bold">{p.title}</div>
                <div className="text-xs opacity-90">
                  {p.type} · {p.status}
                </div>
              </div>
              <div className="p-4">
                <p className="mb-3 text-sm text-slate-600">{p.summary}</p>
                <ul className="mb-3 space-y-1 text-sm text-slate-700">
                  {p.features.map((f) => (
                    <li key={f} className="flex gap-2">
                      <span className="text-red-500">✓</span> {f}
                    </li>
                  ))}
                </ul>
                <p className="text-xs text-slate-400">{p.tech}</p>
              </div>
            </article>
          ))}
        </div>
      </section>

      {/* Process */}
      <section className="border-t border-slate-100 bg-slate-50/50 px-4 py-10">
        <div className="mx-auto max-w-lg">
          <h2 className="mb-5 text-xl font-bold">Ishlash jarayoni</h2>
          <div className="space-y-4">
            {PROCESS.map((step) => (
              <div key={step.n} className="flex gap-4">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-red-600 text-sm font-bold text-white">
                  {step.n}
                </div>
                <div>
                  <div className="font-semibold">{step.title}</div>
                  <div className="text-sm text-slate-500">{step.desc}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Tech */}
      <section className="mx-auto max-w-lg px-4 py-10">
        <h2 className="mb-4 text-xl font-bold">Texnologiyalar</h2>
        <div className="space-y-4">
          {Object.entries(TECH).map(([group, items]) => (
            <div key={group}>
              <div className="mb-2 text-xs font-semibold uppercase tracking-wider text-red-500">
                {group}
              </div>
              <div className="flex flex-wrap gap-2">
                {items.map((t) => (
                  <span
                    key={t}
                    className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-medium text-slate-700"
                  >
                    {t}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Contact */}
      <section className="border-t border-red-100 bg-gradient-to-b from-white to-red-50 px-4 py-12">
        <div className="mx-auto max-w-lg text-center">
          <h2 className="mb-2 text-2xl font-black">
            Keyingi <span className="text-red-600">muvaffaqiyat</span> hikoyasini birga yozamiz
          </h2>
          <p className="mb-6 text-sm text-slate-600">{SADIPRIME.tagline}</p>
          <div className="mb-6 space-y-2 text-sm text-slate-700">
            <div>📧 {SADIPRIME.email}</div>
            <div>📍 {SADIPRIME.location}</div>
            <div>📱 @{SADIPRIME.telegram}</div>
          </div>
          <a
            href={`https://t.me/${SADIPRIME.telegram}`}
            className="inline-block rounded-full bg-red-600 px-8 py-3 text-sm font-bold text-white shadow-lg shadow-red-200"
          >
            Telegramda yozish
          </a>
          <p className="mt-8 text-xs text-slate-400">
            © {new Date().getFullYear()} {SADIPRIME.brand}. Made with ♥ in Uzbekistan
          </p>
        </div>
      </section>
    </div>
  );
}
