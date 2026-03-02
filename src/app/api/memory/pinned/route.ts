/**
 * GET /api/memory/pinned
 * Returns the set of pinned event IDs for the current user.
 */

import { NextResponse } from "next/server";
import { getUserId } from "@/lib/auth";
import { getPinnedEventIds } from "@/lib/data";

export async function GET(request: Request) {
  try {
    const userId = await getUserId(request);
    const pinned = await getPinnedEventIds(userId);
    return NextResponse.json({ pinned: Array.from(pinned) });
  } catch (err) {
    if (err instanceof Error && err.message.includes("Unauthorized")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.json({ error: "Failed to fetch pinned" }, { status: 500 });
  }
}
