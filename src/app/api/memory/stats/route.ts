/**
 * GET /api/memory/stats
 * Output: size, entries, last summarized, byCategory breakdown
 * Per API_CONTRACT.md
 */

import { NextResponse } from "next/server";
import { getUserId } from "@/lib/auth";
import { getMemoryStatsWithBreakdown } from "@/lib/data";

export async function GET(request: Request) {
  try {
    const userId = await getUserId(request);
    const stats = await getMemoryStatsWithBreakdown(userId);

    return NextResponse.json(stats);
  } catch (err) {
    if (err instanceof Error && err.message.includes("Unauthorized")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    console.error("Stats error:", err);
    return NextResponse.json(
      { error: "Failed to fetch stats" },
      { status: 500 }
    );
  }
}
