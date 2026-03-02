/**
 * GET /api/share/data?token=xxx
 * Public: returns events + summary for a valid share token (read-only).
 */

import { NextResponse } from "next/server";
import { getShareTokenData } from "@/lib/data";
import { getEvents, getLatestSummary } from "@/lib/data";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const token = searchParams.get("token");
    if (!token) {
      return NextResponse.json(
        { error: "Missing token" },
        { status: 400 }
      );
    }
    const data = await getShareTokenData(token);
    if (!data) {
      return NextResponse.json(
        { error: "Invalid or expired link" },
        { status: 404 }
      );
    }
    const [events, summary] = await Promise.all([
      getEvents(data.userId),
      getLatestSummary(data.userId),
    ]);
    return NextResponse.json({
      events,
      summary: summary
        ? {
            content: summary.content,
            version: summary.version,
            createdAt: summary.createdAt,
          }
        : null,
      expiresAt: data.expiresAt,
    });
  } catch (err) {
    console.error("Share data error:", err);
    return NextResponse.json(
      { error: "Failed to load shared data" },
      { status: 500 }
    );
  }
}
