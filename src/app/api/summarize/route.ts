/**
 * POST /api/summarize
 * Input: summary trigger
 * Output: new summary version
 * User-triggered only. Per API_CONTRACT.md and AI_BEHAVIOR.md
 * Preserve medications, dates, diagnoses. Remove redundancy. Never delete raw data.
 */

import { NextResponse } from "next/server";
import OpenAI from "openai";
import { getUserId } from "@/lib/auth";
import { isAllowedForOpenAI } from "@/lib/openai-access";
import {
  getEvents,
  getLatestSummary,
  saveSummary,
} from "@/lib/data";
import type { Summary } from "@/lib/types";

const SUMMARIZE_PROMPT = `You are summarizing a user's personal health records into a concise overview.

RULES:
1. Preserve: medications, dates, diagnoses, lab values, key events
2. Remove: redundancy, filler, duplicate information
3. Keep timeline accuracy - maintain chronological order
4. Be factual. Only include what is explicitly in the data.
5. NEVER add medical advice, diagnoses, or treatment recommendations.
6. Output a clear, structured summary the user can reference.`;

export async function POST(request: Request) {
  try {
    const userId = await getUserId(request);

    const events = await getEvents(userId);
    if (events.length === 0) {
      return NextResponse.json(
        { error: "No events to summarize. Add memories first." },
        { status: 400 }
      );
    }

    if (!isAllowedForOpenAI(userId)) {
      return NextResponse.json(
        { error: "AI features are not available for your account." },
        { status: 403 }
      );
    }

    const sizeBefore = JSON.stringify(events).length;
    const lastSummary = await getLatestSummary(userId);
    const nextVersion = (lastSummary?.version ?? 0) + 1;

    const context = events
      .map((e) => `[${e.timestamp}] ${e.category}: ${e.content}`)
      .join("\n");

    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json(
        { error: "AI is not configured. Set OPENAI_API_KEY to enable summarization." },
        { status: 503 }
      );
    }

    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: SUMMARIZE_PROMPT },
        {
          role: "user",
          content: `Summarize the following health records:\n\n${context}`,
        },
      ],
    });

    const text = completion.choices[0]?.message?.content ?? "";

    const summary: Summary = {
      version: nextVersion,
      content: text,
      createdAt: new Date().toISOString(),
      sizeBefore,
      sizeAfter: text.length,
    };

    await saveSummary(userId, summary);

    return NextResponse.json({
      version: nextVersion,
      sizeBefore,
      sizeAfter: summary.sizeAfter,
      reduction: `${(((sizeBefore - summary.sizeAfter) / sizeBefore) * 100).toFixed(1)}%`,
      createdAt: summary.createdAt,
    });
  } catch (err) {
    if (err instanceof Error && err.message.includes("Unauthorized")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    console.error("Summarize error:", err);
    return NextResponse.json(
      { error: "Summarization failed" },
      { status: 500 }
    );
  }
}
