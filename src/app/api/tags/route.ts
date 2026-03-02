/**
 * GET /api/tags
 * Returns unique tags across the user's events (for filtering / chat scope).
 */

import { NextResponse } from "next/server";
import { getUserId } from "@/lib/auth";
import { getUniqueTags } from "@/lib/data";

export async function GET(request: Request) {
  try {
    const userId = await getUserId(request);
    const tags = await getUniqueTags(userId);
    return NextResponse.json({ tags });
  } catch (err) {
    if (err instanceof Error && err.message.includes("Unauthorized")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    console.error("Tags error:", err);
    return NextResponse.json(
      { error: "Failed to fetch tags" },
      { status: 500 }
    );
  }
}
