import { NextRequest, NextResponse } from "next/server";
import { generateSiteContent, SiteInput } from "@/lib/claude";
import { buildSiteHTML, TEMPLATES } from "@/lib/templates";
import { fetchHeroVideo } from "@/lib/pexels";
import { saveSite } from "@/lib/db";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { input, templateId, save = true } = body as {
      input: SiteInput;
      templateId?: string;
      save?: boolean;
    };

    if (!input?.businessName || !input?.industry) {
      return NextResponse.json(
        { error: "businessName and industry are required" },
        { status: 400 }
      );
    }

    const template = TEMPLATES.find((t) => t.id === templateId) || TEMPLATES[0];
    const content = await generateSiteContent(input);
    const heroVideo = await fetchHeroVideo(content.videoQuery);

    const html = buildSiteHTML(
      content,
      template,
      {
        businessName: input.businessName,
        phone: input.phone,
        email: input.email,
        location: input.location,
      },
      heroVideo?.url
    );

    const siteName = input.businessName
      .toLowerCase()
      .replace(/\s+/g, "-")
      .replace(/[^a-z0-9-]/g, "");

    // Auto-save to library unless opted out
    let siteId: string | undefined;
    if (save) {
      const saved = saveSite({
        businessName: input.businessName,
        siteName,
        industry: input.industry,
        location: input.location,
        templateId: template.id,
        html,
        content: content as unknown as Record<string, unknown>,
        status: "draft",
      });
      siteId = saved.id;
    }

    return NextResponse.json({
      success: true,
      content,
      html,
      template,
      hasVideo: !!heroVideo,
      siteName,
      siteId,
    });
  } catch (err) {
    console.error("Generate error:", err);
    return NextResponse.json(
      { error: "Failed to generate site", details: String(err) },
      { status: 500 }
    );
  }
}
