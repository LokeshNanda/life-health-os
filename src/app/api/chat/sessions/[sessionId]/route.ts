/**
 * GET /api/chat/sessions/[sessionId]
 * Returns one chat session with its messages (for resume).
 * DELETE: removes the session and its messages.
 */

import { NextResponse } from "next/server";
import { getUserId } from "@/lib/auth";
import {
  getChatSessionMeta,
  getChatSessionMessages,
  deleteChatSession,
} from "@/lib/chat-sessions";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  try {
    const userId = await getUserId(request);
    const { sessionId } = await params;
    if (!sessionId) {
      return NextResponse.json({ error: "Missing sessionId" }, { status: 400 });
    }
    const [meta, messages] = await Promise.all([
      getChatSessionMeta(userId, sessionId),
      getChatSessionMessages(userId, sessionId),
    ]);
    if (!meta) {
      return NextResponse.json({ error: "Session not found" }, { status: 404 });
    }
    return NextResponse.json({ session: meta, messages });
  } catch (err) {
    if (err instanceof Error && err.message.includes("Unauthorized")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    console.error("Get chat session error:", err);
    return NextResponse.json(
      { error: "Failed to load session" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  try {
    const userId = await getUserId(request);
    const { sessionId } = await params;
    if (!sessionId) {
      return NextResponse.json({ error: "Missing sessionId" }, { status: 400 });
    }
    await deleteChatSession(userId, sessionId);
    return NextResponse.json({ status: "deleted", sessionId });
  } catch (err) {
    if (err instanceof Error && err.message.includes("Unauthorized")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    console.error("Delete chat session error:", err);
    return NextResponse.json(
      { error: "Failed to delete session" },
      { status: 500 }
    );
  }
}
