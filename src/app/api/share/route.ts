/**
 * POST /api/share
 * Create a time-limited share link for read-only access to timeline + summary.
 * Auth required.
 */

import { NextResponse } from "next/server";
import { getUserId } from "@/lib/auth";
import { createShareToken } from "@/lib/data";

export async function POST(request: Request) {
  try {
    const userId = await getUserId(request);
    const { token, expiresAt } = await createShareToken(userId);
    const baseUrl =
      request.headers.get("x-forwarded-host") ||
      request.headers.get("host") ||
      "localhost:3000";
    const protocol = request.headers.get("x-forwarded-proto") === "https" ? "https" : "http";
    const url = `${protocol}://${baseUrl}/share/${token}`;
    return NextResponse.json({ url, expiresAt });
  } catch (err) {
    if (err instanceof Error && err.message.includes("Unauthorized")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    console.error("Share create error:", err);
    return NextResponse.json(
      { error: "Failed to create share link" },
      { status: 500 }
    );
  }
}
