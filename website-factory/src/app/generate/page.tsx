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

interface GeneratedSite {
  html: string;
  siteName: string;
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

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      <nav className="flex items-center justify-between px-8 py-5 border-b border-white/10">
        <Link href="/" className="text-xl font-black tracking-tight">
          <span className="text-indigo-400">site</span>factory
        </Link>
        <div className="flex items-center gap-4">
          <Link href="/bulk" className="text-sm text-gray-400 hover:text-white transition-colors">
            Bulk Import
          </Link>
          <Link href="/dashboard" className="text-sm text-gray-400 hover:text-white transition-colors">
            Dashboard
          </Link>
        </div>
      </nav>

      <div className="max-w-6xl mx-auto px-8 py-12">
        <div className="mb-10">
          <h1 className="text-4xl font-black mb-2">Generate a Website</h1>
          <p className="text-gray-400">
            Fill in the business details. Claude will write all the copy, pull real photos, and build a complete site.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Form */}
          <div className="space-y-5">
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
                  {INDUSTRIES.map((i) => (
                    <option key={i} value={i}>{i}</option>
                  ))}
                </select>
              </div>

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
                <label className="block text-sm font-semibold text-gray-300 mb-1.5">Description</label>
                <textarea
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  placeholder="Brief description of the business, what makes them special..."
                  rows={3}
                  className="w-full bg-white/10 border border-white/20 rounded-xl px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-indigo-500 transition-colors resize-none"
                />
              </div>
            </div>

            <div className="bg-white/5 border border-white/10 rounded-2xl p-6 space-y-4">
              <h2 className="font-bold text-lg">Contact & Services</h2>

              <div className="grid grid-cols-2 gap-4">
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
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-300 mb-1.5">
                  Services (comma separated)
                </label>
                <input
                  type="text"
                  value={form.services}
                  onChange={(e) => setForm({ ...form, services: e.target.value })}
                  placeholder="e.g. Teeth Cleaning, Invisalign, Implants, Emergency Care"
                  className="w-full bg-white/10 border border-white/20 rounded-xl px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-indigo-500 transition-colors"
                />
              </div>
            </div>

            <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
              <h2 className="font-bold text-lg mb-4">Tone</h2>
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
                <span className="flex items-center justify-center gap-2">
                  <span className="animate-spin">⟳</span> Generating...
                </span>
              ) : (
                "Generate Website →"
              )}
            </button>
          </div>

          {/* Preview */}
          <div className="space-y-4">
            <div className="bg-white/5 border border-white/10 rounded-2xl overflow-hidden" style={{ height: "600px" }}>
              {result ? (
                <iframe
                  srcDoc={result.html}
                  className="w-full h-full"
                  title="Site Preview"
                  sandbox="allow-same-origin"
                />
              ) : loading ? (
                <div className="h-full flex flex-col items-center justify-center gap-4 text-gray-500">
                  <div className="w-12 h-12 border-2 border-indigo-500/40 border-t-indigo-500 rounded-full animate-spin" />
                  <p className="text-sm">Claude is writing your site...</p>
                  <p className="text-xs text-gray-600">Usually takes 10-20 seconds</p>
                </div>
              ) : (
                <div className="h-full flex flex-col items-center justify-center gap-3 text-gray-600">
                  <div className="text-5xl">🌐</div>
                  <p className="text-sm font-medium">Your site preview will appear here</p>
                  <p className="text-xs">Fill in the form and click Generate</p>
                </div>
              )}
            </div>

            {result && (
              <div className="flex gap-3">
                <button
                  onClick={downloadSite}
                  className="flex-1 bg-green-500 hover:bg-green-400 text-white font-bold py-3 rounded-xl transition-colors"
                >
                  Download HTML
                </button>
                <button
                  onClick={handleGenerate}
                  className="flex-1 bg-white/10 hover:bg-white/20 text-white font-semibold py-3 rounded-xl transition-colors border border-white/20"
                >
                  Regenerate
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
