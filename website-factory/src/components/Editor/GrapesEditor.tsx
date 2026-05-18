"use client";
import { useEffect, useRef, useState } from "react";

interface Props {
  siteId: string;
  initialHtml: string;
  businessName: string;
  onSave?: (html: string) => void;
}

declare global {
  interface Window {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    grapesjs: any;
  }
}

function extractBodyAndCss(fullHtml: string): { body: string; css: string } {
  const parser = new DOMParser();
  const doc = parser.parseFromString(fullHtml, "text/html");
  const styleEls = doc.querySelectorAll("style");
  const css = Array.from(styleEls)
    .map((s) => s.textContent ?? "")
    .join("\n");
  // Remove script tags from body to avoid double-execution
  doc.querySelectorAll("script").forEach((s) => s.remove());
  return { body: doc.body.innerHTML, css };
}

export default function GrapesEditor({ siteId, initialHtml, businessName, onSave }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const editorRef = useRef<any>(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [deploying, setDeploying] = useState(false);
  const [deployUrl, setDeployUrl] = useState("");
  const [deployError, setDeployError] = useState("");

  useEffect(() => {
    if (!containerRef.current || editorRef.current) return;

    const script = document.createElement("script");
    script.src = "https://unpkg.com/grapesjs@0.21.13/dist/grapes.min.js";
    script.onload = () => {
      const link = document.createElement("link");
      link.rel = "stylesheet";
      link.href = "https://unpkg.com/grapesjs@0.21.13/dist/css/grapes.min.css";
      document.head.appendChild(link);

      const { body, css } = extractBodyAndCss(initialHtml);

      const editor = window.grapesjs.init({
        container: containerRef.current!,
        fromElement: false,
        height: "100%",
        width: "100%",
        components: body,
        style: css,
        storageManager: false,
        deviceManager: {
          devices: [
            { name: "Desktop", width: "" },
            { name: "Tablet", width: "768px", widthMedia: "992px" },
            { name: "Mobile", width: "375px", widthMedia: "480px" },
          ],
        },
        panels: {
          defaults: [
            {
              id: "panel-top",
              el: ".panel__top",
              buttons: [
                {
                  id: "set-device-desktop",
                  label: "🖥",
                  command: "set-device-desktop",
                  active: true,
                  togglable: false,
                },
                {
                  id: "set-device-tablet",
                  label: "📱",
                  command: "set-device-tablet",
                  togglable: false,
                },
                {
                  id: "set-device-mobile",
                  label: "📲",
                  command: "set-device-mobile",
                  togglable: false,
                },
              ],
            },
          ],
        },
        commands: {
          defaults: [
            {
              id: "set-device-desktop",
              run: (ed: { setDevice: (d: string) => void }) => ed.setDevice("Desktop"),
            },
            {
              id: "set-device-tablet",
              run: (ed: { setDevice: (d: string) => void }) => ed.setDevice("Tablet"),
            },
            {
              id: "set-device-mobile",
              run: (ed: { setDevice: (d: string) => void }) => ed.setDevice("Mobile"),
            },
          ],
        },
      });

      editorRef.current = editor;
    };
    document.head.appendChild(script);

    return () => {
      if (editorRef.current) {
        editorRef.current.destroy();
        editorRef.current = null;
      }
    };
  }, [initialHtml]);

  const getExportHtml = (): string => {
    if (!editorRef.current) return initialHtml;
    const parser = new DOMParser();
    const doc = parser.parseFromString(initialHtml, "text/html");
    // Replace body content with GrapesJS output
    doc.body.innerHTML = editorRef.current.getHtml();
    // Update styles
    const oldStyle = doc.querySelector("style");
    const gjsCss = editorRef.current.getCss();
    if (oldStyle && gjsCss) {
      oldStyle.textContent = gjsCss;
    }
    return doc.documentElement.outerHTML;
  };

  const handleSave = async () => {
    setSaving(true);
    setSaved(false);
    const html = getExportHtml();
    try {
      await fetch(`/api/sites/${siteId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ html }),
      });
      onSave?.(html);
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } finally {
      setSaving(false);
    }
  };

  const handleDownload = () => {
    const html = getExportHtml();
    const blob = new Blob([html], { type: "text/html" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${businessName.toLowerCase().replace(/\s+/g, "-")}.html`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleDeploy = async () => {
    setDeploying(true);
    setDeployError("");
    setDeployUrl("");
    try {
      // Save first
      const html = getExportHtml();
      await fetch(`/api/sites/${siteId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ html }),
      });
      // Then deploy
      const res = await fetch(`/api/deploy/${siteId}`, { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.details || data.error);
      setDeployUrl(data.url);
    } catch (err) {
      setDeployError(err instanceof Error ? err.message : "Deploy failed");
    } finally {
      setDeploying(false);
    }
  };

  return (
    <div className="flex flex-col h-screen bg-gray-950">
      {/* Toolbar */}
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-white/10 bg-gray-900 flex-shrink-0 gap-3 flex-wrap">
        <div className="flex items-center gap-3">
          <a href="/sites" className="text-sm text-gray-400 hover:text-white transition-colors">
            ← Sites
          </a>
          <span className="text-white/20">|</span>
          <span className="text-sm font-semibold text-white">{businessName}</span>
          <span className="text-xs text-gray-500 bg-white/10 px-2 py-0.5 rounded-full">GrapesJS Editor</span>
        </div>

        <div className="panel__top flex items-center gap-1" />

        <div className="flex items-center gap-2">
          {deployUrl && (
            <a
              href={deployUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs bg-green-500/20 border border-green-500/40 text-green-300 px-3 py-1.5 rounded-lg hover:bg-green-500/30 transition-colors truncate max-w-[200px]"
            >
              🚀 {deployUrl}
            </a>
          )}
          {deployError && (
            <span className="text-xs text-red-400 max-w-[200px] truncate" title={deployError}>
              ✕ {deployError}
            </span>
          )}
          <button
            onClick={handleDownload}
            className="bg-white/10 hover:bg-white/20 text-white text-sm font-semibold px-3 py-2 rounded-lg transition-colors border border-white/10"
          >
            Download
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="bg-white/10 hover:bg-white/20 text-white text-sm font-semibold px-3 py-2 rounded-lg transition-colors border border-white/10 disabled:opacity-50"
          >
            {saving ? "Saving..." : saved ? "Saved ✓" : "Save"}
          </button>
          <button
            onClick={handleDeploy}
            disabled={deploying}
            className="bg-indigo-500 hover:bg-indigo-400 text-white text-sm font-bold px-4 py-2 rounded-lg transition-colors disabled:opacity-50"
          >
            {deploying ? "Deploying..." : "🚀 Deploy Live"}
          </button>
        </div>
      </div>

      {/* GrapesJS canvas */}
      <div ref={containerRef} className="flex-1 min-h-0" />
    </div>
  );
}
