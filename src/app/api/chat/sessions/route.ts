/**
 * GET /api/chat/sessions
 * Returns list of chat sessions for the current user (newest first).
 */

import { NextResponse } from "next/server";
import { getUserId } from "@/lib/auth";
import { listChatSessions } from "@/lib/chat-sessions";

export async function GET(request: Request) {
  try {
    const userId = await getUserId(request);
    const sessions = await listChatSessions(userId);
    return NextResponse.json({ sessions });
  } catch (err) {
    if (err instanceof Error && err.message.includes("Unauthorized")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    console.error("List chat sessions error:", err);
    return NextResponse.json(
      { error: "Failed to list sessions" },
      { status: 500 }
    );
  }
}
