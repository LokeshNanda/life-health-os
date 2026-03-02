/**
 * GET /api/export
 * Returns user's health events and latest summary for export (JSON/backup).
 */

import { NextResponse } from "next/server";
import { getUserId } from "@/lib/auth";
import { getEvents, getLatestSummary } from "@/lib/data";

export async function GET(request: Request) {
  try {
    const userId = await getUserId(request);
    const [events, summary] = await Promise.all([
      getEvents(userId),
      getLatestSummary(userId),
    ]);

    const payload = {
      exportedAt: new Date().toISOString(),
      exportType: "full" as const,
      description: "Full export of your health memory data (events and summary). Use for backup or data portability (e.g. GDPR).",
      events,
      summary: summary ? { content: summary.content, version: summary.version, createdAt: summary.createdAt } : null,
    };

    return NextResponse.json(payload);
  } catch (err) {
    if (err instanceof Error && err.message.includes("Unauthorized")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    console.error("Export error:", err);
    return NextResponse.json(
      { error: "Failed to export" },
      { status: 500 }
    );
  }
}
