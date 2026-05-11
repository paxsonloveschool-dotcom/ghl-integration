"use client";
import dynamic from "next/dynamic";

const GrapesEditor = dynamic(
  () => import("@/components/Editor/GrapesEditor"),
  { ssr: false, loading: () => (
    <div className="flex items-center justify-center h-screen bg-gray-950 text-white">
      <div className="text-center">
        <div className="w-12 h-12 border-2 border-indigo-500/40 border-t-indigo-500 rounded-full animate-spin mx-auto mb-4" />
        <p className="text-gray-400">Loading GrapesJS editor...</p>
      </div>
    </div>
  )}
);

interface Props {
  siteId: string;
  initialHtml: string;
  businessName: string;
}

export default function EditorClient({ siteId, initialHtml, businessName }: Props) {
  return (
    <GrapesEditor
      siteId={siteId}
      initialHtml={initialHtml}
      businessName={businessName}
    />
  );
}
