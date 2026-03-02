/**
 * GET /api/summary/[version]
 * Returns a specific summary by version (for viewing in UI).
 */

import { NextResponse } from "next/server";
import { getUserId } from "@/lib/auth";
import { getSummaryByVersion } from "@/lib/data";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ version: string }> }
) {
  try {
    const userId = await getUserId(request);
    const { version: versionParam } = await params;
    const version = parseInt(versionParam, 10);
    if (!Number.isInteger(version) || version < 1) {
      return NextResponse.json(
        { error: "Invalid version" },
        { status: 400 }
      );
    }
    const summary = await getSummaryByVersion(userId, version);
    if (!summary) {
      return NextResponse.json(
        { error: "Summary version not found" },
        { status: 404 }
      );
    }
    return NextResponse.json(summary);
  } catch (err) {
    if (err instanceof Error && err.message.includes("Unauthorized")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    console.error("Summary get error:", err);
    return NextResponse.json(
      { error: "Failed to fetch summary" },
      { status: 500 }
    );
  }
}
