import Link from "next/link";
import { getAllSites } from "@/lib/db";

export const dynamic = "force-dynamic";

export default function DashboardPage() {
  const sites = getAllSites();
  const deployed = sites.filter((s) => s.status === "deployed").length;
  const drafts = sites.filter((s) => s.status === "draft").length;
  const recent = sites.slice(0, 5);

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      <nav className="flex items-center justify-between px-8 py-5 border-b border-white/10">
        <div className="text-xl font-black tracking-tight">
          <span className="text-indigo-400">site</span>factory
        </div>
        <div className="flex items-center gap-4">
          <Link href="/sites" className="text-sm text-gray-400 hover:text-white transition-colors">Library</Link>
          <Link href="/bulk" className="text-sm text-gray-400 hover:text-white transition-colors">Bulk</Link>
          <Link href="/generate" className="bg-indigo-500 hover:bg-indigo-400 text-white text-sm font-semibold px-4 py-2 rounded-lg transition-colors">
            + New Site
          </Link>
        </div>
      </nav>

      <div className="max-w-6xl mx-auto px-8 py-12">
        <h1 className="text-4xl font-black mb-2">Dashboard</h1>
        <p className="text-gray-400 mb-10">Your website factory at a glance.</p>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-10">
          {[
            { label: "Total Sites", value: sites.length, color: "text-white" },
            { label: "Live & Deployed", value: deployed, color: "text-green-400" },
            { label: "Drafts", value: drafts, color: "text-yellow-400" },
            { label: "Est. Token Cost", value: `~$${(sites.length * 0.04).toFixed(2)}`, color: "text-indigo-400" },
          ].map((s) => (
            <div key={s.label} className="bg-white/5 border border-white/10 rounded-2xl p-5">
              <div className={`text-3xl font-black mb-1 ${s.color}`}>{s.value}</div>
              <div className="text-sm text-gray-400">{s.label}</div>
            </div>
          ))}
        </div>

        {/* Quick actions */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-10">
          <Link href="/generate" className="bg-indigo-500/20 border border-indigo-500/40 hover:bg-indigo-500/30 rounded-2xl p-6 transition-all group">
            <div className="text-3xl mb-3">⚡</div>
            <h3 className="font-bold text-lg mb-1 group-hover:text-indigo-300 transition-colors">Generate Single Site</h3>
            <p className="text-sm text-gray-400">Business details → Claude writes everything → deploy in 60 seconds.</p>
          </Link>
          <Link href="/bulk" className="bg-purple-500/20 border border-purple-500/40 hover:bg-purple-500/30 rounded-2xl p-6 transition-all group">
            <div className="text-3xl mb-3">📋</div>
            <h3 className="font-bold text-lg mb-1 group-hover:text-purple-300 transition-colors">Bulk CSV Import</h3>
            <p className="text-sm text-gray-400">Upload a spreadsheet of 50 businesses. Generate all sites at once.</p>
          </Link>
          <Link href="/sites" className="bg-green-500/20 border border-green-500/40 hover:bg-green-500/30 rounded-2xl p-6 transition-all group">
            <div className="text-3xl mb-3">🗂</div>
            <h3 className="font-bold text-lg mb-1 group-hover:text-green-300 transition-colors">Site Library</h3>
            <p className="text-sm text-gray-400">View, edit in GrapesJS, deploy, and manage all generated sites.</p>
          </Link>
        </div>

        {/* Recent sites */}
        {recent.length > 0 && (
          <div className="bg-white/5 border border-white/10 rounded-2xl p-6 mb-6">
            <div className="flex items-center justify-between mb-5">
              <h2 className="font-bold text-lg">Recent Sites</h2>
              <Link href="/sites" className="text-sm text-indigo-400 hover:text-indigo-300 transition-colors">View all →</Link>
            </div>
            <div className="space-y-3">
              {recent.map((site) => (
                <div key={site.id} className="flex items-center gap-4 py-2.5 border-b border-white/5 last:border-0">
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold text-sm truncate">{site.businessName}</div>
                    <div className="text-xs text-gray-500">{site.industry}{site.location ? ` · ${site.location}` : ""}</div>
                  </div>
                  <span className={`text-xs px-2 py-1 rounded-full font-semibold ${site.status === "deployed" ? "bg-green-500/20 text-green-300" : "bg-white/10 text-gray-400"}`}>
                    {site.status === "deployed" ? "🚀 Live" : "Draft"}
                  </span>
                  <Link href={`/editor/${site.id}`} className="text-xs bg-white/10 hover:bg-white/20 text-white px-3 py-1.5 rounded-lg transition-colors">
                    Edit
                  </Link>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Cost & setup */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
            <h2 className="font-bold text-lg mb-4">Cost Per Site</h2>
            <div className="space-y-3">
              {[
                { label: "Claude Sonnet 4.6", cost: "~$0.04", note: "Per generated site" },
                { label: "Pexels Video API", cost: "Free", note: "200 req/hr" },
                { label: "Unsplash Photos", cost: "Free", note: "Open API" },
                { label: "Cloudflare Workers", cost: "Free", note: "100k req/day free tier" },
              ].map((c) => (
                <div key={c.label} className="flex items-center justify-between">
                  <div>
                    <div className="text-sm font-semibold">{c.label}</div>
                    <div className="text-xs text-gray-500">{c.note}</div>
                  </div>
                  <div className="text-sm font-black text-green-400">{c.cost}</div>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
            <h2 className="font-bold text-lg mb-4">Required Setup</h2>
            <div className="space-y-3">
              {[
                { label: "ANTHROPIC_API_KEY", desc: "Required — console.anthropic.com", required: true },
                { label: "PEXELS_API_KEY", desc: "Optional — enables video heroes, pexels.com/api", required: false },
                { label: "CLOUDFLARE_API_TOKEN", desc: "Optional — enables one-click deploy", required: false },
                { label: "CLOUDFLARE_ACCOUNT_ID", desc: "Optional — your CF account ID", required: false },
              ].map((item) => (
                <div key={item.label} className="flex items-start gap-3">
                  <span className={`text-xs mt-0.5 ${item.required ? "text-red-400" : "text-gray-500"}`}>{item.required ? "●" : "○"}</span>
                  <div>
                    <code className="text-xs font-mono text-indigo-300">{item.label}</code>
                    <div className="text-xs text-gray-500">{item.desc}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
