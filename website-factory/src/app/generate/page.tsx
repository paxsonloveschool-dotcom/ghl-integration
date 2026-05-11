"use client";
import { useState } from "react";
import Link from "next/link";

const INDUSTRIES = [
  "Restaurant", "Dental Practice", "Law Firm", "Real Estate", "Auto Repair",
  "Hair Salon / Barbershop", "HVAC & Plumbing", "Landscaping", "Gym / Fitness",
  "Medical Clinic", "Accounting / CPA", "Photography", "Wedding Planning",
  "Roofing & Construction", "Pet Services", "Cleaning Service", "Marketing Agency",
  "Software / SaaS", "eCommerce", "Consulting", "Other",
];

const TONES = [
  { value: "professional", label: "Professional" },
  { value: "friendly", label: "Friendly" },
  { value: "bold", label: "Bold" },
  { value: "luxury", label: "Luxury" },
  { value: "playful", label: "Playful" },
] as const;

const TEMPLATES = [
  { id: "midnight", name: "Midnight", desc: "Dark & cinematic", color: "#6366f1", bg: "#0a0a0f" },
  { id: "pearl",    name: "Pearl",    desc: "Clean & minimal",  color: "#0f172a", bg: "#f9fafb" },
  { id: "ember",    name: "Ember",    desc: "Bold & energetic", color: "#f97316", bg: "#0a0700" },
  { id: "sage",     name: "Sage",     desc: "Natural & calm",   color: "#059669", bg: "#f0faf4" },
  { id: "cobalt",   name: "Cobalt",   desc: "Sharp & modern",   color: "#2563eb", bg: "#030712" },
];

interface GeneratedSite {
  html: string;
  siteName: string;
  siteId?: string;
  hasVideo?: boolean;
  content: unknown;
}

export default function GeneratePage() {
  const [form, setForm] = useState({
    businessName: "",
    industry: "",
    location: "",
    description: "",
    phone: "",
    email: "",
    services: "",
    tone: "professional" as "professional" | "friendly" | "bold" | "luxury" | "playful",
  });
  const [templateId, setTemplateId] = useState("midnight");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<GeneratedSite | null>(null);
  const [error, setError] = useState("");

  const handleGenerate = async () => {
    if (!form.businessName || !form.industry) {
      setError("Business name and industry are required.");
      return;
    }
    setError("");
    setLoading(true);
    setResult(null);

    try {
      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          input: {
            ...form,
            services: form.services
              ? form.services.split(",").map((s) => s.trim()).filter(Boolean)
              : [],
          },
          templateId,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Generation failed");
      setResult(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  const downloadSite = () => {
    if (!result) return;
    const blob = new Blob([result.html], { type: "text/html" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${result.siteName}.html`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const openPreview = () => {
    if (!result) return;
    const win = window.open("", "_blank");
    if (win) { win.document.write(result.html); win.document.close(); }
  };

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      <nav className="flex items-center justify-between px-8 py-5 border-b border-white/10">
        <Link href="/" className="text-xl font-black tracking-tight">
          <span className="text-indigo-400">site</span>factory
        </Link>
        <div className="flex items-center gap-4">
          <Link href="/bulk" className="text-sm text-gray-400 hover:text-white transition-colors">Bulk</Link>
          <Link href="/sites" className="text-sm text-gray-400 hover:text-white transition-colors">Library</Link>
          <Link href="/dashboard" className="text-sm text-gray-400 hover:text-white transition-colors">Dashboard</Link>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-8 py-12">
        <div className="mb-10">
          <h1 className="text-4xl font-black mb-2">Generate a Website</h1>
          <p className="text-gray-400">Full-screen video hero, scroll animations, 5 distinct design systems. ~15 seconds.</p>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
          {/* ── LEFT: FORM ── */}
          <div className="space-y-5">

            {/* Template picker */}
            <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
              <h2 className="font-bold text-lg mb-4">Design Template</h2>
              <div className="grid grid-cols-5 gap-2">
                {TEMPLATES.map((t) => (
                  <button
                    key={t.id}
                    onClick={() => setTemplateId(t.id)}
                    className={`relative rounded-xl overflow-hidden border-2 transition-all ${
                      templateId === t.id ? "border-indigo-500 scale-105" : "border-white/10 hover:border-white/30"
                    }`}
                  >
                    <div className="h-16" style={{ background: t.bg }}>
                      <div className="h-2 w-full" style={{ background: t.color }} />
                      <div className="px-2 pt-2 space-y-1">
                        <div className="h-1.5 rounded-full opacity-40" style={{ background: t.color, width: "80%" }} />
                        <div className="h-1 rounded-full bg-white/20 w-full" />
                        <div className="h-1 rounded-full bg-white/10 w-3/4" />
                      </div>
                    </div>
                    <div className="p-1.5 text-center" style={{ background: t.bg }}>
                      <div className="text-xs font-bold" style={{ color: t.color }}>{t.name}</div>
                    </div>
                  </button>
                ))}
              </div>
              <p className="text-xs text-gray-500 mt-2">
                {TEMPLATES.find(t => t.id === templateId)?.desc}
              </p>
            </div>

            {/* Business info */}
            <div className="bg-white/5 border border-white/10 rounded-2xl p-6 space-y-4">
              <h2 className="font-bold text-lg">Business Info</h2>

              <div>
                <label className="block text-sm font-semibold text-gray-300 mb-1.5">
                  Business Name <span className="text-red-400">*</span>
                </label>
                <input
                  type="text"
                  value={form.businessName}
                  onChange={(e) => setForm({ ...form, businessName: e.target.value })}
                  placeholder="e.g. Austin Family Dental"
                  className="w-full bg-white/10 border border-white/20 rounded-xl px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-indigo-500 transition-colors"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-300 mb-1.5">
                  Industry <span className="text-red-400">*</span>
                </label>
                <select
                  value={form.industry}
                  onChange={(e) => setForm({ ...form, industry: e.target.value })}
                  className="w-full bg-gray-900 border border-white/20 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-indigo-500 transition-colors"
                >
                  <option value="">Select an industry...</option>
                  {INDUSTRIES.map((i) => <option key={i} value={i}>{i}</option>)}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-300 mb-1.5">Location</label>
                  <input
                    type="text"
                    value={form.location}
                    onChange={(e) => setForm({ ...form, location: e.target.value })}
                    placeholder="e.g. Austin, TX"
                    className="w-full bg-white/10 border border-white/20 rounded-xl px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-indigo-500 transition-colors"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-300 mb-1.5">Phone</label>
                  <input
                    type="tel"
                    value={form.phone}
                    onChange={(e) => setForm({ ...form, phone: e.target.value })}
                    placeholder="(512) 555-0100"
                    className="w-full bg-white/10 border border-white/20 rounded-xl px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-indigo-500 transition-colors"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-300 mb-1.5">Email</label>
                <input
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  placeholder="hello@business.com"
                  className="w-full bg-white/10 border border-white/20 rounded-xl px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-indigo-500 transition-colors"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-300 mb-1.5">Services (comma separated)</label>
                <input
                  type="text"
                  value={form.services}
                  onChange={(e) => setForm({ ...form, services: e.target.value })}
                  placeholder="Teeth Cleaning, Invisalign, Implants"
                  className="w-full bg-white/10 border border-white/20 rounded-xl px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-indigo-500 transition-colors"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-300 mb-1.5">Description</label>
                <textarea
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  placeholder="What makes this business special? Any details Claude should know..."
                  rows={2}
                  className="w-full bg-white/10 border border-white/20 rounded-xl px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-indigo-500 transition-colors resize-none"
                />
              </div>
            </div>

            {/* Tone */}
            <div className="bg-white/5 border border-white/10 rounded-2xl p-5">
              <h2 className="font-bold mb-3">Brand Tone</h2>
              <div className="flex gap-2 flex-wrap">
                {TONES.map((t) => (
                  <button
                    key={t.value}
                    onClick={() => setForm({ ...form, tone: t.value })}
                    className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
                      form.tone === t.value
                        ? "bg-indigo-500 text-white"
                        : "bg-white/10 text-gray-300 hover:bg-white/20"
                    }`}
                  >
                    {t.label}
                  </button>
                ))}
              </div>
            </div>

            {error && (
              <div className="bg-red-500/20 border border-red-500/40 text-red-300 rounded-xl px-4 py-3 text-sm">
                {error}
              </div>
            )}

            <button
              onClick={handleGenerate}
              disabled={loading}
              className="w-full bg-indigo-500 hover:bg-indigo-400 disabled:opacity-60 disabled:cursor-not-allowed text-white font-bold py-4 rounded-xl text-lg transition-all hover:-translate-y-0.5 shadow-lg shadow-indigo-500/30"
            >
              {loading ? (
                <span className="flex items-center justify-center gap-3">
                  <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Claude is writing your site...
                </span>
              ) : (
                "Generate Website →"
              )}
            </button>
          </div>

          {/* ── RIGHT: PREVIEW ── */}
          <div className="space-y-4">
            <div
              className="bg-white/5 border border-white/10 rounded-2xl overflow-hidden relative"
              style={{ height: "680px" }}
            >
              {result ? (
                <>
                  <iframe
                    srcDoc={result.html}
                    className="w-full h-full"
                    title="Site Preview"
                    sandbox="allow-same-origin allow-scripts"
                  />
                  {result.hasVideo && (
                    <div className="absolute top-3 left-3 bg-black/70 text-white text-xs font-semibold px-2.5 py-1 rounded-full">
                      🎬 Video Hero
                    </div>
                  )}
                </>
              ) : loading ? (
                <div className="h-full flex flex-col items-center justify-center gap-4 text-gray-500">
                  <div className="w-14 h-14 border-2 border-indigo-500/40 border-t-indigo-500 rounded-full animate-spin" />
                  <div className="text-center">
                    <p className="text-sm font-medium text-gray-300">Building your site...</p>
                    <p className="text-xs mt-1">Claude is crafting copy + pulling assets</p>
                  </div>
                  <div className="flex gap-2 mt-2">
                    {["Headline ✓", "Copy...", "Photos...", "Template..."].map((s, i) => (
                      <span key={s} className="text-xs bg-white/5 border border-white/10 px-2 py-1 rounded-full" style={{ opacity: 0.4 + i * 0.15 }}>{s}</span>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="h-full flex flex-col items-center justify-center gap-3 text-gray-600">
                  <div className="text-6xl">🌐</div>
                  <p className="text-sm font-medium text-gray-400">Site preview will appear here</p>
                  <p className="text-xs">Full-screen hero · Scroll animations · Video support</p>
                </div>
              )}
            </div>

            {result && (
              <div className="space-y-2">
                <div className="flex gap-2">
                  {result.siteId && (
                    <a
                      href={`/editor/${result.siteId}`}
                      className="flex-1 text-center bg-indigo-500 hover:bg-indigo-400 text-white font-bold py-3 rounded-xl transition-colors"
                    >
                      🎨 Edit in GrapesJS
                    </a>
                  )}
                  <button
                    onClick={downloadSite}
                    className="flex-1 bg-green-500/20 hover:bg-green-500/30 text-green-300 font-bold py-3 rounded-xl transition-colors border border-green-500/30"
                  >
                    Download HTML
                  </button>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={openPreview}
                    className="flex-1 bg-white/10 hover:bg-white/20 text-white font-semibold py-3 rounded-xl transition-colors border border-white/20"
                  >
                    Open Full Screen
                  </button>
                  {result.siteId && (
                    <a
                      href="/sites"
                      className="flex-1 text-center bg-white/10 hover:bg-white/20 text-white font-semibold py-3 rounded-xl transition-colors border border-white/20"
                    >
                      View Library
                    </a>
                  )}
                  <button
                    onClick={handleGenerate}
                    className="px-4 bg-white/10 hover:bg-white/20 text-white font-semibold py-3 rounded-xl transition-colors border border-white/20"
                    title="Regenerate"
                  >
                    ↻
                  </button>
                </div>
              </div>
            )}

            {!result && !loading && (
              <div className="bg-white/5 border border-white/10 rounded-2xl p-5 space-y-3">
                <p className="text-xs font-bold uppercase tracking-widest text-gray-500">What you get</p>
                {[
                  "Full-screen video or photo hero (100vh, full bleed)",
                  "Scroll-triggered animations on every section",
                  "Parallax depth effect on hero media",
                  "Counter animations on stats (0 → 500+ etc.)",
                  "Service cards with 3D hover lift",
                  "Process section, testimonials with star ratings",
                  "Glassmorphism nav · mobile hamburger menu",
                  "Clean HTML/CSS — zero dependencies, deploys anywhere",
                ].map((f) => (
                  <div key={f} className="flex items-start gap-2 text-sm text-gray-400">
                    <span className="text-indigo-400 mt-0.5">✓</span>
                    {f}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
