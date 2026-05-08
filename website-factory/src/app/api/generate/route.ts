import { NextRequest, NextResponse } from "next/server";
import { generateSiteContent, SiteInput } from "@/lib/claude";
import { buildSiteHTML, TEMPLATES } from "@/lib/templates";

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

    const content = await generateSiteContent(input);
    const html = buildSiteHTML(content, template, {
      businessName: input.businessName,
      phone: input.phone,
      email: input.email,
      location: input.location,
    });

    return NextResponse.json({
      success: true,
      content,
      html,
      template,
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
