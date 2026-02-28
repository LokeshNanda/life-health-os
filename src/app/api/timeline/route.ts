/**
 * GET /api/timeline
 * Returns user's health events for timeline view
 */

import { NextResponse } from "next/server";
import { getUserId } from "@/lib/auth";
import { getEvents } from "@/lib/data";

export async function GET(request: Request) {
  try {
    const userId = getUserId(request);
    const events = await getEvents(userId);
    return NextResponse.json(events);
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
