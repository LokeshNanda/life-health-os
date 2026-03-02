/**
 * DELETE /api/memory/[id]/edit
 * Revert event to original (remove edit overlay).
 */

import { NextResponse } from "next/server";
import { getUserId } from "@/lib/auth";
import { getEventById, deleteEventEdit } from "@/lib/data";

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
    const event = await getEventById(userId, id);
    if (!event) {
      return NextResponse.json({ error: "Event not found" }, { status: 404 });
    }
    await deleteEventEdit(userId, id);
    return NextResponse.json({ eventId: id, reverted: true });
  } catch (err) {
    if (err instanceof Error && err.message.includes("Unauthorized")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    console.error("Revert edit error:", err);
    return NextResponse.json(
      { error: "Failed to revert edit" },
      { status: 500 }
    );
  }
}
