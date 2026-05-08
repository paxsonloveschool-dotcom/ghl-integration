"use client";
import Link from "next/link";

export default function DashboardPage() {
  return (
    <div className="min-h-screen bg-gray-950 text-white">
      <nav className="flex items-center justify-between px-8 py-5 border-b border-white/10">
        <Link href="/" className="text-xl font-black tracking-tight">
          <span className="text-indigo-400">site</span>factory
        </Link>
        <div className="flex items-center gap-3">
          <Link
            href="/generate"
            className="bg-indigo-500 hover:bg-indigo-400 text-white text-sm font-semibold px-4 py-2 rounded-lg transition-colors"
          >
            + New Site
          </Link>
        </div>
      </nav>

      <div className="max-w-6xl mx-auto px-8 py-12">
        <h1 className="text-4xl font-black mb-2">Dashboard</h1>
        <p className="text-gray-400 mb-10">Manage and track all your generated websites.</p>

        {/* Quick actions */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-12">
          <Link
            href="/generate"
            className="bg-indigo-500/20 border border-indigo-500/40 hover:bg-indigo-500/30 rounded-2xl p-6 transition-all group"
          >
            <div className="text-3xl mb-3">⚡</div>
            <h3 className="font-bold text-lg mb-1 group-hover:text-indigo-300 transition-colors">
              Generate Single Site
            </h3>
            <p className="text-sm text-gray-400">
              Enter business details and get a complete website in 60 seconds.
            </p>
          </Link>

          <Link
            href="/bulk"
            className="bg-purple-500/20 border border-purple-500/40 hover:bg-purple-500/30 rounded-2xl p-6 transition-all group"
          >
            <div className="text-3xl mb-3">📋</div>
            <h3 className="font-bold text-lg mb-1 group-hover:text-purple-300 transition-colors">
              Bulk CSV Import
            </h3>
            <p className="text-sm text-gray-400">
              Upload a spreadsheet and generate up to 50 sites at once.
            </p>
          </Link>

          <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
            <div className="text-3xl mb-3">🚀</div>
            <h3 className="font-bold text-lg mb-1">Deploy to Cloudflare</h3>
            <p className="text-sm text-gray-400 mb-3">
              Set your Cloudflare API token to auto-deploy sites for free.
            </p>
            <div className="text-xs text-indigo-400 font-semibold">Coming soon →</div>
          </div>
        </div>

        {/* How it works */}
        <div className="bg-white/5 border border-white/10 rounded-2xl p-8">
          <h2 className="font-bold text-xl mb-6">How the Stack Works</h2>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            {[
              {
                step: "01",
                title: "Input",
                desc: "Business name, industry, location, services — via form, AI prompt, or CSV.",
              },
              {
                step: "02",
                title: "Claude Generates",
                desc: "Claude writes all headlines, copy, testimonials, CTAs, and picks the right Unsplash photos.",
              },
              {
                step: "03",
                title: "Site Built",
                desc: "A complete HTML/CSS/JS site is assembled from your template with Claude's content injected.",
              },
              {
                step: "04",
                title: "Export & Deploy",
                desc: "Download as a single HTML file or deploy to Cloudflare Pages — free for unlimited sites.",
              },
            ].map((s) => (
              <div key={s.step}>
                <div className="text-3xl font-black text-indigo-500/40 mb-2">{s.step}</div>
                <h3 className="font-bold mb-1">{s.title}</h3>
                <p className="text-sm text-gray-400 leading-relaxed">{s.desc}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Cost breakdown */}
        <div className="bg-white/5 border border-white/10 rounded-2xl p-8 mt-6">
          <h2 className="font-bold text-xl mb-4">Cost Per Site</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { label: "Claude Sonnet 4.6", cost: "~$0.02–0.05", note: "Per site generated" },
              { label: "Unsplash Photos", cost: "Free", note: "Open API, no limits" },
              { label: "Cloudflare Pages", cost: "Free", note: "Unlimited sites" },
              { label: "Your infrastructure", cost: "$0", note: "Self-hosted" },
            ].map((c) => (
              <div key={c.label} className="bg-black/30 rounded-xl p-4">
                <div className="text-lg font-black text-green-400 mb-1">{c.cost}</div>
                <div className="font-semibold text-sm mb-0.5">{c.label}</div>
                <div className="text-xs text-gray-500">{c.note}</div>
              </div>
            ))}
          </div>
          <p className="text-sm text-gray-500 mt-4">
            1,000 sites = approximately $20–50 in Claude tokens. Everything else is free.
          </p>
        </div>
      </div>
    </div>
  );
}
