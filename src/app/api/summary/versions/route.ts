/**
 * GET /api/summary/versions
 * Returns list of summary versions (newest first) with createdAt.
 */

import { NextResponse } from "next/server";
import { getUserId } from "@/lib/auth";
import { getSummaryVersions, getSummaryByVersion } from "@/lib/data";

export async function GET(request: Request) {
  try {
    const userId = await getUserId(request);
    const versionNumbers = await getSummaryVersions(userId);
    const versions = await Promise.all(
      versionNumbers.map(async (version) => {
        const s = await getSummaryByVersion(userId, version);
        return {
          version,
          createdAt: s?.createdAt ?? null,
        };
      })
    );
    return NextResponse.json({
      versions: versions.filter((v) => v.createdAt != null),
    });
  } catch (err) {
    if (err instanceof Error && err.message.includes("Unauthorized")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    console.error("Summary versions error:", err);
    return NextResponse.json(
      { error: "Failed to fetch summary versions" },
      { status: 500 }
    );
  }
}
