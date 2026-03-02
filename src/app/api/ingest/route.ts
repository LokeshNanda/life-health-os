/**
 * POST /api/ingest
 * Input: file | text | audio
 * Output: ingestion status
 * Per API_CONTRACT.md
 */

import { NextResponse } from "next/server";
import pdfParse from "pdf-parse";
import OpenAI from "openai";
import { getUserId } from "@/lib/auth";
import { isAllowedForOpenAI } from "@/lib/openai-access";
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

/** Normalize tags from array or comma-separated string to non-empty trimmed strings. */
function normalizeTags(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value
      .flatMap((t) => (typeof t === "string" ? t.split(",") : []))
      .map((s) => s.trim().toLowerCase())
      .filter(Boolean);
  }
  if (typeof value === "string" && value.trim()) {
    return value
      .split(",")
      .map((s) => s.trim().toLowerCase())
      .filter(Boolean);
  }
  return [];
}

async function extractPdfText(file: File): Promise<string> {
  const arrayBuffer = await file.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);
  const result = await pdfParse(buffer);
  return result.text ?? "";
}

const AUDIO_EXTENSIONS = [".mp3", ".wav", ".m4a", ".webm", ".mp4", ".mpeg", ".mpga"];
const IMAGE_EXTENSIONS = [".png", ".jpg", ".jpeg", ".webp", ".gif"];

function isAudioFile(file: File): boolean {
  const type = file.type?.toLowerCase() ?? "";
  const name = file.name?.toLowerCase() ?? "";
  return type.startsWith("audio/") || AUDIO_EXTENSIONS.some((ext) => name.endsWith(ext));
}

function isImageFile(file: File): boolean {
  const type = file.type?.toLowerCase() ?? "";
  const name = file.name?.toLowerCase() ?? "";
  return (
    type.startsWith("image/") || IMAGE_EXTENSIONS.some((ext) => name.endsWith(ext))
  );
}

async function transcribeAudio(file: File): Promise<string> {
  if (!process.env.OPENAI_API_KEY) {
    throw new Error("OPENAI_API_KEY is required for voice transcription.");
  }
  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  const arrayBuffer = await file.arrayBuffer();
  const fileForApi = new File([arrayBuffer], file.name || "audio.webm", {
    type: file.type || "audio/webm",
  });
  const transcription = await openai.audio.transcriptions.create({
    file: fileForApi,
    model: "whisper-1",
  });
  return transcription.text ?? "";
}

async function extractTextFromImage(file: File): Promise<string> {
  if (!process.env.OPENAI_API_KEY) {
    throw new Error("OPENAI_API_KEY is required for image extraction.");
  }
  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  const arrayBuffer = await file.arrayBuffer();
  const base64 = Buffer.from(arrayBuffer).toString("base64");
  const mimeType = file.type || "image/png";

  const completion = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [
      {
        role: "user",
        content: [
          {
            type: "text",
            text: "Extract all text visible in this image. For medical documents, prescriptions, or lab results, transcribe everything legibly. Preserve structure (lists, tables) as plain text. If no text is visible, describe the image briefly.",
          },
          {
            type: "image_url",
            image_url: { url: `data:${mimeType};base64,${base64}` },
          },
        ],
      },
    ],
  });

  return completion.choices[0]?.message?.content ?? "";
}

export async function POST(request: Request) {
  try {
    const userId = await getUserId(request);
    const contentType = request.headers.get("content-type") ?? "";

    let content: string;
    let category: DataCategory = "note";
    let timestampOverride: string | undefined;
    let tags: string[] = [];

    if (contentType.includes("application/json")) {
      const body = await request.json();
      content = body.text ?? body.content ?? String(body);
      if (body.category && DATA_CATEGORIES.includes(body.category)) {
        category = body.category;
      }
      timestampOverride = body.timestamp;
      tags = normalizeTags(body.tags);
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
        const isPdf =
          file.type === "application/pdf" || file.name?.toLowerCase().endsWith(".pdf");
        const isText =
          file.type.startsWith("text/") || file.name?.toLowerCase().endsWith(".txt");

        if (isPdf) {
          content = await extractPdfText(file);
          category = "document";
        } else if (isText) {
          content = await file.text();
        } else if (isAudioFile(file)) {
          if (!isAllowedForOpenAI(userId)) {
            return NextResponse.json(
              { error: "Voice transcription is not available for your account." },
              { status: 403 }
            );
          }
          content = await transcribeAudio(file);
          category = "voice_transcript";
        } else if (isImageFile(file)) {
          if (!isAllowedForOpenAI(userId)) {
            return NextResponse.json(
              { error: "Image extraction is not available for your account." },
              { status: 403 }
            );
          }
          content = await extractTextFromImage(file);
          category = "document";
        } else {
          return NextResponse.json(
            { error: "Unsupported file type. Use .txt, .pdf, audio (mp3, wav, m4a, webm), or images (png, jpg, webp)." },
            { status: 400 }
          );
        }
      } else {
        return NextResponse.json(
          { error: "Provide 'text' or 'file' in form data" },
          { status: 400 }
        );
      }
      if (cat && DATA_CATEGORIES.includes(cat as DataCategory)) category = cat as DataCategory;
      const ts = formData.get("timestamp");
      if (ts && typeof ts === "string") timestampOverride = ts;
      const tagsRaw = formData.get("tags");
      if (tagsRaw != null) tags = normalizeTags(tagsRaw);
    } else {
      return NextResponse.json(
        { error: "Unsupported content type. Use JSON, text, or multipart/form-data." },
        { status: 400 }
      );
    }

    if (!content?.trim()) {
      return NextResponse.json({ error: "Empty content" }, { status: 400 });
    }

    let eventTimestamp: string;
    if (timestampOverride) {
      const d = new Date(timestampOverride);
      if (Number.isNaN(d.getTime())) {
        return NextResponse.json({ error: "Invalid timestamp; use ISO 8601 date" }, { status: 400 });
      }
      eventTimestamp = d.toISOString();
    } else {
      eventTimestamp = new Date().toISOString();
    }

    const event: HealthEvent = {
      id: generateId(),
      category,
      content: content.trim(),
      timestamp: eventTimestamp,
      ...(tags.length > 0 && { tags }),
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
