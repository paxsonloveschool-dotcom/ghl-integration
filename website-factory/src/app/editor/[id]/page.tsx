import { notFound } from "next/navigation";
import { getSite } from "@/lib/db";
import EditorClient from "./EditorClient";

export default async function EditorPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const site = getSite(id);
  if (!site) notFound();

  return (
    <EditorClient
      siteId={site.id}
      initialHtml={site.html}
      businessName={site.businessName}
    />
  );
}
