import { NextRequest, NextResponse } from "next/server";
import { generateSiteContent, SiteInput } from "@/lib/claude";
import { buildSiteHTML, TEMPLATES } from "@/lib/templates";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { sites, templateId } = body as {
      sites: SiteInput[];
      templateId?: string;
    };

    if (!Array.isArray(sites) || sites.length === 0) {
      return NextResponse.json(
        { error: "sites array is required" },
        { status: 400 }
      );
    }

    if (sites.length > 50) {
      return NextResponse.json(
        { error: "Max 50 sites per bulk request" },
        { status: 400 }
      );
    }

    const template =
      TEMPLATES.find((t) => t.id === templateId) || TEMPLATES[0];

    const results = await Promise.allSettled(
      sites.map(async (input) => {
        const content = await generateSiteContent(input);
        const html = buildSiteHTML(content, template, {
          businessName: input.businessName,
          phone: input.phone,
          email: input.email,
          location: input.location,
        });
        return {
          businessName: input.businessName,
          siteName: input.businessName
            .toLowerCase()
            .replace(/\s+/g, "-")
            .replace(/[^a-z0-9-]/g, ""),
          content,
          html,
        };
      })
    );

    const successful = results
      .filter((r) => r.status === "fulfilled")
      .map((r) => (r as PromiseFulfilledResult<unknown>).value);

    const failed = results
      .filter((r) => r.status === "rejected")
      .map((r, i) => ({
        index: i,
        error: (r as PromiseRejectedResult).reason?.message || "Unknown error",
      }));

    return NextResponse.json({
      success: true,
      total: sites.length,
      generated: successful.length,
      failed: failed.length,
      sites: successful,
      errors: failed,
    });
  } catch (err) {
    console.error("Bulk generate error:", err);
    return NextResponse.json(
      { error: "Bulk generation failed", details: String(err) },
      { status: 500 }
    );
  }
}
