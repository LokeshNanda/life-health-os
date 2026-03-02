/**
 * GET /api/memory/[id] — fetch one event (with edits applied).
 * PATCH /api/memory/[id] — update event (edit overlay).
 * DELETE /api/memory/[id] — soft-delete event.
 */

import { NextResponse } from "next/server";
import { getUserId } from "@/lib/auth";
import { deleteEvent, getEventById, setEventEdit } from "@/lib/data";
import type { DataCategory } from "@/lib/types";

const DATA_CATEGORIES: DataCategory[] = [
  "medical_event",
  "medication",
  "lab_result",
  "note",
  "document",
  "voice_transcript",
];

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const userId = await getUserId(request);
    const { id } = await params;
    if (!id) {
      return NextResponse.json({ error: "Missing event id" }, { status: 400 });
    }
    const event = await getEventById(userId, id);
    if (!event) {
      return NextResponse.json({ error: "Event not found" }, { status: 404 });
    }
    return NextResponse.json(event);
  } catch (err) {
    if (err instanceof Error && err.message.includes("Unauthorized")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    console.error("Get memory error:", err);
    return NextResponse.json(
      { error: "Failed to fetch memory" },
      { status: 500 }
    );
  }
}

export async function PATCH(
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

    let body: Record<string, unknown>;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }

    const overrides: {
      content?: string;
      category?: DataCategory;
      timestamp?: string;
      tags?: string[];
    } = {};

    if (body.content !== undefined) {
      const content = typeof body.content === "string" ? body.content.trim() : "";
      if (content === "") {
        return NextResponse.json(
          { error: "Content cannot be empty" },
          { status: 400 }
        );
      }
      overrides.content = content;
    }
    if (body.category !== undefined) {
      if (!DATA_CATEGORIES.includes(body.category as DataCategory)) {
        return NextResponse.json(
          { error: "Invalid category" },
          { status: 400 }
        );
      }
      overrides.category = body.category as DataCategory;
    }
    if (body.timestamp !== undefined) {
      const ts = typeof body.timestamp === "string" ? body.timestamp : String(body.timestamp);
      const d = new Date(ts);
      if (Number.isNaN(d.getTime())) {
        return NextResponse.json(
          { error: "Invalid timestamp; use ISO 8601 date" },
          { status: 400 }
        );
      }
      overrides.timestamp = d.toISOString();
    }
    if (body.tags !== undefined) {
      overrides.tags = Array.isArray(body.tags)
        ? body.tags.map((t) => String(t).trim().toLowerCase()).filter(Boolean)
        : [];
    }

    if (Object.keys(overrides).length === 0) {
      return NextResponse.json(
        { error: "No fields to update; provide content, category, timestamp, or tags" },
        { status: 400 }
      );
    }

    const edit = await setEventEdit(userId, id, overrides);
    const updated = await getEventById(userId, id);
    return NextResponse.json({
      eventId: id,
      editedAt: edit.editedAt,
      event: updated ?? undefined,
    });
  } catch (err) {
    if (err instanceof Error && err.message.includes("Unauthorized")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    console.error("Patch memory error:", err);
    return NextResponse.json(
      { error: "Failed to update memory" },
      { status: 500 }
    );
  }
}

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
