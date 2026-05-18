"use client";
import { useState, useRef } from "react";
import Link from "next/link";

interface SiteRow {
  businessName: string;
  industry: string;
  location?: string;
  phone?: string;
  email?: string;
  services?: string;
  description?: string;
}

interface GeneratedResult {
  businessName: string;
  siteName: string;
  html: string;
}

function parseCSV(text: string): SiteRow[] {
  const lines = text.trim().split("\n");
  if (lines.length < 2) return [];

  const headers = lines[0].split(",").map((h) => h.trim().toLowerCase().replace(/[^a-z]/g, ""));
  const rows: SiteRow[] = [];

  for (let i = 1; i < lines.length; i++) {
    const cols = lines[i].split(",").map((c) => c.trim().replace(/^"|"$/g, ""));
    const row: Record<string, string> = {};
    headers.forEach((h, idx) => {
      row[h] = cols[idx] || "";
    });

    if (row.businessname || row.name) {
      rows.push({
        businessName: row.businessname || row.name || "",
        industry: row.industry || row.type || "Business",
        location: row.location || row.city || "",
        phone: row.phone || "",
        email: row.email || "",
        services: row.services || "",
        description: row.description || row.desc || "",
      });
    }
  }

  return rows;
}

export default function BulkPage() {
  const [rows, setRows] = useState<SiteRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<GeneratedResult[]>([]);
  const [progress, setProgress] = useState({ done: 0, total: 0 });
  const [error, setError] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const text = ev.target?.result as string;
      const parsed = parseCSV(text);
      setRows(parsed);
      setError(parsed.length === 0 ? "No valid rows found. Check CSV format." : "");
    };
    reader.readAsText(file);
  };

  const handleGenerate = async () => {
    if (rows.length === 0) return;
    setLoading(true);
    setResults([]);
    setProgress({ done: 0, total: rows.length });
    setError("");

    const batchSize = 5;
    const allResults: GeneratedResult[] = [];

    for (let i = 0; i < rows.length; i += batchSize) {
      const batch = rows.slice(i, i + batchSize);
      try {
        const res = await fetch("/api/bulk", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            sites: batch.map((r) => ({
              ...r,
              services: r.services ? r.services.split(";").map((s) => s.trim()) : [],
            })),
          }),
        });
        const data = await res.json();
        if (data.sites) {
          allResults.push(...(data.sites as GeneratedResult[]));
        }
        setProgress((p) => ({ ...p, done: Math.min(p.done + batch.length, rows.length) }));
        setResults([...allResults]);
      } catch {
        // continue with next batch
      }
    }

    setLoading(false);
  };

  const downloadAll = () => {
    results.forEach((r, i) => {
      setTimeout(() => {
        const blob = new Blob([r.html], { type: "text/html" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `${r.siteName}.html`;
        a.click();
        URL.revokeObjectURL(url);
      }, i * 300);
    });
  };

  const SAMPLE_CSV = `businessName,industry,location,phone,email,services,description
Austin Family Dental,Dental Practice,Austin TX,(512) 555-0101,hello@austindental.com,Cleanings;Implants;Invisalign,Family-friendly dental practice open since 2005
Peak Performance Gym,Gym / Fitness,Dallas TX,(214) 555-0202,info@peakgym.com,Personal Training;CrossFit;Yoga,High-energy gym with certified trainers
Green Thumb Landscaping,Landscaping,Houston TX,(713) 555-0303,contact@greenthumb.com,Lawn Care;Tree Trimming;Irrigation,Serving Houston homeowners for 15 years`;

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      <nav className="flex items-center justify-between px-8 py-5 border-b border-white/10">
        <Link href="/" className="text-xl font-black tracking-tight">
          <span className="text-indigo-400">site</span>factory
        </Link>
        <div className="flex items-center gap-4">
          <Link href="/generate" className="text-sm text-gray-400 hover:text-white transition-colors">
            Single Site
          </Link>
          <Link href="/dashboard" className="text-sm text-gray-400 hover:text-white transition-colors">
            Dashboard
          </Link>
        </div>
      </nav>

      <div className="max-w-5xl mx-auto px-8 py-12">
        <div className="mb-10">
          <h1 className="text-4xl font-black mb-2">Bulk Site Generator</h1>
          <p className="text-gray-400">
            Upload a CSV with business data. Generate up to 50 complete websites at once.
          </p>
        </div>

        {/* CSV format guide */}
        <div className="bg-white/5 border border-white/10 rounded-2xl p-6 mb-6">
          <h2 className="font-bold mb-3">CSV Format</h2>
          <p className="text-sm text-gray-400 mb-3">
            Required columns: <code className="text-indigo-300">businessName</code>, <code className="text-indigo-300">industry</code>.
            Optional: <code className="text-indigo-300">location</code>, <code className="text-indigo-300">phone</code>, <code className="text-indigo-300">email</code>, <code className="text-indigo-300">services</code> (semicolon-separated), <code className="text-indigo-300">description</code>
          </p>
          <pre className="bg-black/40 rounded-xl p-4 text-xs text-green-300 overflow-x-auto whitespace-pre">
            {SAMPLE_CSV}
          </pre>
          <button
            onClick={() => {
              const blob = new Blob([SAMPLE_CSV], { type: "text/csv" });
              const url = URL.createObjectURL(blob);
              const a = document.createElement("a");
              a.href = url;
              a.download = "sample-businesses.csv";
              a.click();
            }}
            className="mt-3 text-xs text-indigo-400 hover:text-indigo-300 underline"
          >
            Download sample CSV
          </button>
        </div>

        {/* Upload */}
        <div className="bg-white/5 border border-white/10 rounded-2xl p-6 mb-6">
          <div
            onClick={() => fileRef.current?.click()}
            className="border-2 border-dashed border-white/20 rounded-xl p-10 text-center cursor-pointer hover:border-indigo-500/60 hover:bg-indigo-500/5 transition-all"
          >
            <div className="text-4xl mb-3">📋</div>
            <p className="font-semibold text-white mb-1">Click to upload CSV</p>
            <p className="text-sm text-gray-500">Max 50 businesses per file</p>
          </div>
          <input ref={fileRef} type="file" accept=".csv" onChange={handleFile} className="hidden" />

          {rows.length > 0 && (
            <div className="mt-4">
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm font-semibold text-green-400">
                  ✓ {rows.length} business{rows.length > 1 ? "es" : ""} loaded
                </span>
                <button onClick={() => setRows([])} className="text-xs text-gray-500 hover:text-red-400 transition-colors">
                  Clear
                </button>
              </div>
              <div className="space-y-1 max-h-40 overflow-y-auto">
                {rows.map((r, i) => (
                  <div key={i} className="flex items-center gap-3 text-sm bg-white/5 rounded-lg px-3 py-1.5">
                    <span className="text-gray-500 w-5 text-right">{i + 1}</span>
                    <span className="font-medium">{r.businessName}</span>
                    <span className="text-gray-500">{r.industry}</span>
                    {r.location && <span className="text-gray-600 text-xs">{r.location}</span>}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {error && (
          <div className="bg-red-500/20 border border-red-500/40 text-red-300 rounded-xl px-4 py-3 text-sm mb-4">
            {error}
          </div>
        )}

        {rows.length > 0 && (
          <button
            onClick={handleGenerate}
            disabled={loading}
            className="w-full bg-indigo-500 hover:bg-indigo-400 disabled:opacity-60 disabled:cursor-not-allowed text-white font-bold py-4 rounded-xl text-lg transition-all mb-8"
          >
            {loading
              ? `Generating... (${progress.done}/${progress.total})`
              : `Generate ${rows.length} Website${rows.length > 1 ? "s" : ""} →`}
          </button>
        )}

        {loading && (
          <div className="mb-8">
            <div className="flex justify-between text-sm text-gray-400 mb-2">
              <span>Progress</span>
              <span>{progress.done}/{progress.total}</span>
            </div>
            <div className="bg-white/10 rounded-full h-2">
              <div
                className="bg-indigo-500 h-2 rounded-full transition-all duration-500"
                style={{ width: `${(progress.done / progress.total) * 100}%` }}
              />
            </div>
          </div>
        )}

        {results.length > 0 && (
          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-bold text-xl">
                {results.length} Sites Generated
              </h2>
              <button
                onClick={downloadAll}
                className="bg-green-500 hover:bg-green-400 text-white font-bold px-6 py-2.5 rounded-xl transition-colors text-sm"
              >
                Download All
              </button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {results.map((r) => (
                <div key={r.siteName} className="bg-white/5 border border-white/10 rounded-2xl overflow-hidden">
                  <div className="h-40 bg-gray-900">
                    <iframe
                      srcDoc={r.html}
                      className="w-full h-full scale-50 origin-top-left pointer-events-none"
                      style={{ width: "200%", height: "200%" }}
                      title={r.businessName}
                      sandbox="allow-same-origin"
                    />
                  </div>
                  <div className="p-4 flex items-center justify-between">
                    <div>
                      <div className="font-semibold text-sm">{r.businessName}</div>
                      <div className="text-xs text-gray-500">{r.siteName}.html</div>
                    </div>
                    <button
                      onClick={() => {
                        const blob = new Blob([r.html], { type: "text/html" });
                        const url = URL.createObjectURL(blob);
                        const a = document.createElement("a");
                        a.href = url;
                        a.download = `${r.siteName}.html`;
                        a.click();
                      }}
                      className="bg-white/10 hover:bg-white/20 text-white text-xs font-semibold px-3 py-2 rounded-lg transition-colors"
                    >
                      Download
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
