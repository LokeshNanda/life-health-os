/**
 * POST /api/chat
 * Input: user message
 * Output: AI response
 * AI operates ONLY on Redis-retrieved data. Never infers medical conclusions.
 * Per API_CONTRACT.md and AI_BEHAVIOR.md
 */

import { NextResponse } from "next/server";
import OpenAI from "openai";
import { getUserId } from "@/lib/auth";
import { getEvents, getLatestSummary, getAiContext } from "@/lib/data";

const SYSTEM_PROMPT = `You are a personal health memory assistant. You help users organize and query their health records.

CRITICAL RULES - YOU MUST FOLLOW:
1. Answer ONLY from the provided context (user's health data). Never use external knowledge.
2. If the answer is not in the context, say "I don't have that information in your records."
3. NEVER diagnose diseases, recommend treatments, or prescribe medication.
4. NEVER infer medical conclusions. Only restate what is explicitly in the data.
5. This app is for information organization only. It does NOT provide medical advice.`;

function buildContext(events: { category: string; content: string; timestamp: string }[], summary: { content: string } | null, aiContext: string | null): string {
  const parts: string[] = [];

  if (summary) {
    parts.push("## Latest Summary\n" + summary.content);
  }

  if (aiContext) {
    parts.push("## AI Working Memory\n" + aiContext);
  }

  parts.push("## Raw Health Events (chronological)\n");
  for (const e of events) {
    parts.push(`[${e.timestamp}] ${e.category}: ${e.content}`);
  }

  return parts.join("\n\n");
}

export async function POST(request: Request) {
  try {
    const userId = getUserId(request);
    const { message } = await request.json();

    if (!message || typeof message !== "string") {
      return NextResponse.json(
        { error: "Missing or invalid 'message' in body" },
        { status: 400 }
      );
    }

    const [events, summary, aiContext] = await Promise.all([
      getEvents(userId),
      getLatestSummary(userId),
      getAiContext(userId),
    ]);

    const context = buildContext(events, summary, aiContext);

    if (!context.trim() || (events.length === 0 && !summary && !aiContext)) {
      return NextResponse.json({
        text: "I don't have any health records for you yet. Add memories (documents, notes, lab results) to get started.",
      });
    }

    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json({
        text: "AI is not configured. Set OPENAI_API_KEY to enable chat.",
      });
    }

    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: `${SYSTEM_PROMPT}\n\n---\n\n## User's Health Data (your only source of truth)\n\n${context}`,
        },
        { role: "user", content: message },
      ],
    });

    const text = completion.choices[0]?.message?.content ?? "";
    return NextResponse.json({ text });
  } catch (err) {
    if (err instanceof Error && err.message.includes("Unauthorized")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    console.error("Chat error:", err);
    return NextResponse.json(
      { error: "Chat failed" },
      { status: 500 }
    );
  }
}
