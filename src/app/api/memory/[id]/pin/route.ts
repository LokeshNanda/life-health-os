/**
 * POST /api/memory/[id]/pin — pin an event.
 * DELETE /api/memory/[id]/pin — unpin an event.
 */

import { NextResponse } from "next/server";
import { getUserId } from "@/lib/auth";
import { getEventById, addPinned, removePinned } from "@/lib/data";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const userId = await getUserId(request);
    const { id } = await params;
    if (!id) return NextResponse.json({ error: "Missing event id" }, { status: 400 });
    const event = await getEventById(userId, id);
    if (!event) return NextResponse.json({ error: "Event not found" }, { status: 404 });
    await addPinned(userId, id);
    return NextResponse.json({ pinned: true, eventId: id });
  } catch (err) {
    if (err instanceof Error && err.message.includes("Unauthorized")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.json({ error: "Failed to pin" }, { status: 500 });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const userId = await getUserId(request);
    const { id } = await params;
    if (!id) return NextResponse.json({ error: "Missing event id" }, { status: 400 });
    await removePinned(userId, id);
    return NextResponse.json({ pinned: false, eventId: id });
  } catch (err) {
    if (err instanceof Error && err.message.includes("Unauthorized")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.json({ error: "Failed to unpin" }, { status: 500 });
  }
}
