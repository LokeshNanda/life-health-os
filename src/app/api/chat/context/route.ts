/**
 * DELETE /api/chat/context
 * Clears the AI working memory (conversation context) for the current user.
 */

import { NextResponse } from "next/server";
import { getUserId } from "@/lib/auth";
import { setAiContext } from "@/lib/data";

export async function DELETE(request: Request) {
  try {
    const userId = await getUserId(request);
    await setAiContext(userId, "");
    return NextResponse.json({ ok: true });
  } catch (err) {
    if (err instanceof Error && err.message.includes("Unauthorized")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    console.error("Clear context error:", err);
    return NextResponse.json(
      { error: "Failed to clear context" },
      { status: 500 }
    );
  }
}
