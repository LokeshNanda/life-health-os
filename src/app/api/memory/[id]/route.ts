/**
 * DELETE /api/memory/[id]
 * Soft-deletes an event by id. Event remains in stream but is filtered from reads.
 */

import { NextResponse } from "next/server";
import { getUserId } from "@/lib/auth";
import { deleteEvent } from "@/lib/data";

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const userId = await getUserId(request);
    const { id } = await params;

    if (!id) {
      return NextResponse.json(
        { error: "Missing event id" },
        { status: 400 }
      );
    }

    await deleteEvent(userId, id);

    return NextResponse.json({ status: "deleted", id });
  } catch (err) {
    if (err instanceof Error && err.message.includes("Unauthorized")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    console.error("Delete memory error:", err);
    return NextResponse.json(
      { error: "Failed to delete memory" },
      { status: 500 }
    );
  }
}
