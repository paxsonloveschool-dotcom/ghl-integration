import { NextRequest, NextResponse } from "next/server";
import { getAllSites, saveSite } from "@/lib/db";

export async function GET() {
  try {
    const sites = getAllSites();
    return NextResponse.json({ sites });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const site = saveSite(body);
    return NextResponse.json({ site });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
