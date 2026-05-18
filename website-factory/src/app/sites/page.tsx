"use client";
import { useEffect, useState } from "react";
import Link from "next/link";

interface Site {
  id: string;
  businessName: string;
  siteName: string;
  industry: string;
  location?: string;
  templateId: string;
  deployedUrl?: string;
  status: "draft" | "deployed";
  createdAt: string;
}

const TEMPLATE_COLORS: Record<string, string> = {
  midnight: "#6366f1",
  pearl: "#0f172a",
  ember: "#f97316",
  sage: "#059669",
  cobalt: "#2563eb",
};

export default function SitesPage() {
  const [sites, setSites] = useState<Site[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [deploying, setDeploying] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  const fetchSites = async () => {
    const res = await fetch("/api/sites");
    const data = await res.json();
    setSites(data.sites ?? []);
    setLoading(false);
  };

  useEffect(() => { fetchSites(); }, []);

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this site?")) return;
    setDeleting(id);
    await fetch(`/api/sites/${id}`, { method: "DELETE" });
    setSites((prev) => prev.filter((s) => s.id !== id));
    setDeleting(null);
  };

  const handleDeploy = async (id: string) => {
    setDeploying(id);
    const res = await fetch(`/api/deploy/${id}`, { method: "POST" });
    const data = await res.json();
    if (data.url) {
      setSites((prev) =>
        prev.map((s) => s.id === id ? { ...s, deployedUrl: data.url, status: "deployed" } : s)
      );
    } else {
      alert("Deploy failed: " + (data.details || data.error));
    }
    setDeploying(null);
  };

  const filtered = sites.filter((s) =>
    s.businessName.toLowerCase().includes(search.toLowerCase()) ||
    s.industry.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      <nav className="flex items-center justify-between px-8 py-5 border-b border-white/10">
        <Link href="/" className="text-xl font-black tracking-tight">
          <span className="text-indigo-400">site</span>factory
        </Link>
        <div className="flex items-center gap-4">
          <Link href="/generate" className="bg-indigo-500 hover:bg-indigo-400 text-white text-sm font-semibold px-4 py-2 rounded-lg transition-colors">
            + New Site
          </Link>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-8 py-12">
        <div className="flex items-center justify-between mb-8 flex-wrap gap-4">
          <div>
            <h1 className="text-4xl font-black mb-1">Site Library</h1>
            <p className="text-gray-400">{sites.length} site{sites.length !== 1 ? "s" : ""} generated</p>
          </div>
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name or industry..."
            className="bg-white/10 border border-white/20 rounded-xl px-4 py-2.5 text-white placeholder-gray-500 focus:outline-none focus:border-indigo-500 w-64"
          />
        </div>

        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="bg-white/5 border border-white/10 rounded-2xl h-72 animate-pulse" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-24">
            <div className="text-6xl mb-4">🌐</div>
            <h2 className="text-2xl font-bold mb-2">
              {sites.length === 0 ? "No sites yet" : "No results"}
            </h2>
            <p className="text-gray-500 mb-6">
              {sites.length === 0
                ? "Generate your first site to see it here."
                : "Try a different search term."}
            </p>
            {sites.length === 0 && (
              <Link
                href="/generate"
                className="bg-indigo-500 hover:bg-indigo-400 text-white font-bold px-6 py-3 rounded-xl transition-colors"
              >
                Generate a Site →
              </Link>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {filtered.map((site) => (
              <div
                key={site.id}
                className="bg-white/5 border border-white/10 rounded-2xl overflow-hidden hover:border-white/20 transition-colors group"
              >
                {/* Color header */}
                <div
                  className="h-2"
                  style={{ background: TEMPLATE_COLORS[site.templateId] ?? "#6366f1" }}
                />

                {/* Info */}
                <div className="p-5">
                  <div className="flex items-start justify-between gap-2 mb-3">
                    <div className="flex-1 min-w-0">
                      <h3 className="font-bold text-base leading-tight truncate">{site.businessName}</h3>
                      <p className="text-xs text-gray-500 mt-0.5">{site.industry}{site.location ? ` · ${site.location}` : ""}</p>
                    </div>
                    <span className={`text-xs font-semibold px-2 py-1 rounded-full flex-shrink-0 ${
                      site.status === "deployed"
                        ? "bg-green-500/20 text-green-300 border border-green-500/30"
                        : "bg-white/10 text-gray-400"
                    }`}>
                      {site.status === "deployed" ? "🚀 Live" : "Draft"}
                    </span>
                  </div>

                  <div className="text-xs text-gray-600 mb-4">
                    {new Date(site.createdAt).toLocaleDateString("en-US", {
                      month: "short", day: "numeric", year: "numeric", hour: "2-digit", minute: "2-digit",
                    })}
                  </div>

                  {site.deployedUrl && (
                    <a
                      href={site.deployedUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="block text-xs text-indigo-400 hover:text-indigo-300 truncate mb-3 transition-colors"
                    >
                      {site.deployedUrl}
                    </a>
                  )}

                  {/* Actions */}
                  <div className="flex gap-2 flex-wrap">
                    <Link
                      href={`/editor/${site.id}`}
                      className="flex-1 text-center bg-white/10 hover:bg-white/20 text-white text-xs font-semibold px-3 py-2 rounded-lg transition-colors border border-white/10"
                    >
                      Edit
                    </Link>
                    <button
                      onClick={() => handleDeploy(site.id)}
                      disabled={deploying === site.id}
                      className="flex-1 bg-indigo-500/20 hover:bg-indigo-500/40 text-indigo-300 text-xs font-semibold px-3 py-2 rounded-lg transition-colors border border-indigo-500/30 disabled:opacity-50"
                    >
                      {deploying === site.id ? "Deploying..." : site.deployedUrl ? "Redeploy" : "Deploy"}
                    </button>
                    <button
                      onClick={() => handleDelete(site.id)}
                      disabled={deleting === site.id}
                      className="bg-red-500/10 hover:bg-red-500/20 text-red-400 text-xs font-semibold px-3 py-2 rounded-lg transition-colors border border-red-500/20 disabled:opacity-50"
                    >
                      {deleting === site.id ? "..." : "✕"}
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
