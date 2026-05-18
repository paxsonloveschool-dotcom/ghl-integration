"use client";
import Link from "next/link";

export default function Home() {
  return (
    <div className="min-h-screen bg-gray-950 text-white">
      <nav className="flex items-center justify-between px-8 py-5 border-b border-white/10">
        <div className="text-xl font-black tracking-tight">
          <span className="text-indigo-400">site</span>factory
        </div>
        <div className="flex items-center gap-4">
          <Link href="/generate" className="text-sm text-gray-400 hover:text-white transition-colors">
            Generate
          </Link>
          <Link href="/bulk" className="text-sm text-gray-400 hover:text-white transition-colors">
            Bulk
          </Link>
          <Link href="/dashboard" className="bg-indigo-500 hover:bg-indigo-400 text-white text-sm font-semibold px-4 py-2 rounded-lg transition-colors">
            Dashboard
          </Link>
        </div>
      </nav>

      <main className="max-w-5xl mx-auto px-8 py-24 text-center">
        <div className="inline-block bg-indigo-500/20 border border-indigo-500/40 text-indigo-300 text-xs font-bold uppercase tracking-widest px-4 py-2 rounded-full mb-8">
          AI Website Factory
        </div>

        <h1 className="text-6xl md:text-7xl font-black leading-tight mb-6">
          Build{" "}
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-purple-400">
            thousands
          </span>{" "}
          of websites.
          <br />
          Pay only for AI tokens.
        </h1>

        <p className="text-xl text-gray-400 max-w-2xl mx-auto mb-12 leading-relaxed">
          Powered by GrapesJS + Claude. Generate pro-quality, custom websites at scale —
          one at a time or hundreds via CSV. Every site looks hand-crafted, not AI slop.
        </p>

        <div className="flex items-center justify-center gap-4 flex-wrap mb-20">
          <Link
            href="/generate"
            className="bg-indigo-500 hover:bg-indigo-400 text-white font-bold px-8 py-4 rounded-xl text-lg transition-all hover:-translate-y-1 shadow-lg shadow-indigo-500/30"
          >
            Generate a Site
          </Link>
          <Link
            href="/bulk"
            className="bg-white/10 hover:bg-white/20 text-white font-bold px-8 py-4 rounded-xl text-lg transition-all hover:-translate-y-1 border border-white/20"
          >
            Bulk Import CSV
          </Link>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-left">
          {[
            {
              icon: "⚡",
              title: "60-second sites",
              desc: "Type a business name and industry. Claude generates all copy, headlines, and CTAs. Done.",
            },
            {
              icon: "🎨",
              title: "GrapesJS editor",
              desc: "Every site opens in a full drag-and-drop visual editor. Tweak anything before export.",
            },
            {
              icon: "📋",
              title: "Bulk CSV import",
              desc: "Upload a spreadsheet of 50 businesses. Get 50 unique, polished websites back.",
            },
            {
              icon: "🖼",
              title: "Real photography",
              desc: "Auto-pulls relevant photos from Unsplash. No stock photo slop, no placeholders.",
            },
            {
              icon: "📤",
              title: "One-click export",
              desc: "Download clean HTML/CSS/JS. Deploy anywhere — Cloudflare Pages, Netlify, S3.",
            },
            {
              icon: "💰",
              title: "Zero monthly fees",
              desc: "No Lovable. No Framer. No Webflow. Pay only Claude API tokens per generation.",
            },
          ].map((f) => (
            <div
              key={f.title}
              className="bg-white/5 border border-white/10 rounded-2xl p-6 hover:bg-white/8 transition-colors"
            >
              <div className="text-3xl mb-3">{f.icon}</div>
              <h3 className="font-bold text-white mb-2">{f.title}</h3>
              <p className="text-gray-400 text-sm leading-relaxed">{f.desc}</p>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}
