import { NextRequest, NextResponse } from "next/server";
import { generateSiteContent, SiteInput } from "@/lib/claude";
import { buildSiteHTML, TEMPLATES } from "@/lib/templates";
import { fetchHeroVideo } from "@/lib/pexels";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { input, templateId } = body as {
      input: SiteInput;
      templateId?: string;
    };

    if (!input?.businessName || !input?.industry) {
      return NextResponse.json(
        { error: "businessName and industry are required" },
        { status: 400 }
      );
    }

    const template =
      TEMPLATES.find((t) => t.id === templateId) || TEMPLATES[0];

    // Run content generation and video fetch in parallel
    const [content, video] = await Promise.all([
      generateSiteContent(input),
      Promise.resolve(null), // video fetched after content since we need videoQuery
    ]);

    // Fetch video using Claude's suggested query
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

    void video; // suppress unused warning

    return NextResponse.json({
      success: true,
      content,
      html,
      template,
      hasVideo: !!heroVideo,
      siteName: input.businessName
        .toLowerCase()
        .replace(/\s+/g, "-")
        .replace(/[^a-z0-9-]/g, ""),
    });
  } catch (err) {
    console.error("Generate error:", err);
    return NextResponse.json(
      { error: "Failed to generate site", details: String(err) },
      { status: 500 }
    );
  }
}
