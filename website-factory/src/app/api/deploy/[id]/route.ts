import { NextRequest, NextResponse } from "next/server";
import { getSite, updateSite } from "@/lib/db";
import { deployToCloudflare } from "@/lib/cloudflare";

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const site = getSite(id);
  if (!site) return NextResponse.json({ error: "Site not found" }, { status: 404 });

  try {
    const { url } = await deployToCloudflare(site.siteName, site.html);
    const updated = updateSite(id, { deployedUrl: url, status: "deployed" });
    return NextResponse.json({ success: true, url, site: updated });
  } catch (err) {
    return NextResponse.json(
      { error: "Deployment failed", details: String(err) },
      { status: 500 }
    );
  }
}
