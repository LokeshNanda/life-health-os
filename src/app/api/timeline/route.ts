/**
 * GET /api/timeline
 * Returns user's health events for timeline view.
 * Query: limit (default 30), after (stream cursor for next page)
 */

import { NextResponse } from "next/server";
import { getUserId } from "@/lib/auth";
import { getEventsPage } from "@/lib/data";

export async function GET(request: Request) {
  try {
    const userId = await getUserId(request);
    const { searchParams } = new URL(request.url);
    const limit = Math.min(
      100,
      Math.max(1, parseInt(searchParams.get("limit") ?? "30", 10) || 30)
    );
    const after = searchParams.get("after") ?? undefined;
    const page = await getEventsPage(userId, { limit, after });
    return NextResponse.json(page);
  } catch (err) {
    if (err instanceof Error && err.message.includes("Unauthorized")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    console.error("Timeline error:", err);
    return NextResponse.json(
      { error: "Failed to fetch timeline" },
      { status: 500 }
    );
  }
}
