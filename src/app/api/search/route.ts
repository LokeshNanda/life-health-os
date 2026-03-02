/**
 * GET /api/search
 * Global search across timeline, summaries, and optionally chat.
 * Query: q (min 2 chars), sources (optional: timeline,summaries,chat comma-separated; default all)
 */

import { NextResponse } from "next/server";
import { getUserId } from "@/lib/auth";
import {
  searchEvents,
  searchSummary,
  searchChat,
} from "@/lib/data";

const SOURCES = ["timeline", "summaries", "chat"] as const;
type Source = (typeof SOURCES)[number];

function parseSources(param: string | null): Set<Source> {
  if (!param) return new Set(SOURCES);
  const set = new Set<Source>();
  for (const s of param.split(",").map((x) => x.trim().toLowerCase())) {
    if (SOURCES.includes(s as Source)) set.add(s as Source);
  }
  return set;
}

export async function GET(request: Request) {
  try {
    const userId = await getUserId(request);
    const { searchParams } = new URL(request.url);
    const q = searchParams.get("q")?.trim() ?? "";
    const sources = parseSources(searchParams.get("sources"));

    if (q.length < 2) {
      return NextResponse.json(
        { timeline: { events: [] }, summaries: null, chat: { sessions: [] } },
        { status: 200 }
      );
    }

    const [timelineRes, summaryRes, chatRes] = await Promise.all([
      sources.has("timeline") ? searchEvents(userId, q) : Promise.resolve({ events: [] }),
      sources.has("summaries") ? searchSummary(userId, q) : Promise.resolve(null),
      sources.has("chat") ? searchChat(userId, q) : Promise.resolve({ sessions: [] }),
    ]);

    return NextResponse.json({
      timeline: { events: timelineRes.events },
      summaries: summaryRes,
      chat: { sessions: chatRes.sessions },
    });
  } catch (err) {
    if (err instanceof Error && err.message.includes("Unauthorized")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    console.error("Search error:", err);
    return NextResponse.json(
      { error: "Failed to search" },
      { status: 500 }
    );
  }
}
