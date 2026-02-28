/**
 * POST /api/ingest
 * Input: file | text | audio
 * Output: ingestion status
 * Per API_CONTRACT.md
 */

import { NextResponse } from "next/server";
import { getUserId } from "@/lib/auth";
import { addEvent } from "@/lib/data";
import type { DataCategory, HealthEvent } from "@/lib/types";

const DATA_CATEGORIES: DataCategory[] = [
  "medical_event",
  "medication",
  "lab_result",
  "note",
  "document",
  "voice_transcript",
];

function generateId(): string {
  return `evt_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

export async function POST(request: Request) {
  try {
    const userId = getUserId(request);
    const contentType = request.headers.get("content-type") ?? "";

    let content: string;
    let category: DataCategory = "note";

    if (contentType.includes("application/json")) {
      const body = await request.json();
      content = body.text ?? body.content ?? String(body);
      if (body.category && DATA_CATEGORIES.includes(body.category)) {
        category = body.category;
      }
    } else if (contentType.includes("text/plain")) {
      content = await request.text();
    } else if (contentType.includes("multipart/form-data")) {
      const formData = await request.formData();
      const file = formData.get("file") as File | null;
      const text = formData.get("text") as string | null;
      const cat = formData.get("category") as string | null;

      if (text) {
        content = text;
      } else if (file) {
        content = await file.text();
        if (file.type.startsWith("audio/")) category = "voice_transcript";
        else if (file.type.includes("pdf") || file.type.includes("image"))
          category = "document";
      } else {
        return NextResponse.json(
          { error: "Provide 'text' or 'file' in form data" },
          { status: 400 }
        );
      }
      if (cat && DATA_CATEGORIES.includes(cat as DataCategory)) category = cat as DataCategory;
    } else {
      return NextResponse.json(
        { error: "Unsupported content type. Use JSON, text, or multipart/form-data." },
        { status: 400 }
      );
    }

    if (!content?.trim()) {
      return NextResponse.json({ error: "Empty content" }, { status: 400 });
    }

    const event: HealthEvent = {
      id: generateId(),
      category,
      content: content.trim(),
      timestamp: new Date().toISOString(),
    };

    const id = await addEvent(userId, event);

    return NextResponse.json({
      status: "ingested",
      id,
      eventId: event.id,
      category,
    });
  } catch (err) {
    if (err instanceof Error && err.message.includes("Unauthorized")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    console.error("Ingest error:", err);
    return NextResponse.json(
      { error: "Ingestion failed" },
      { status: 500 }
    );
  }
}
