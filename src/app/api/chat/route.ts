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
import { isAllowedForOpenAI } from "@/lib/openai-access";
import { getEvents, getLatestSummary } from "@/lib/data";
import {
  createChatSession,
  getChatSessionMessages,
  buildSessionContext,
  appendChatMessages,
  sessionTitleFromMessage,
} from "@/lib/chat-sessions";
import type { StoredChatMessage } from "@/lib/types";

const SYSTEM_PROMPT = `You are a personal health memory assistant. You help users organize and query their health records.

CRITICAL RULES - YOU MUST FOLLOW:
1. Answer ONLY from the provided context (user's health data). Never use external knowledge.
2. If the answer is not in the context, say "I don't have that information in your records."
3. NEVER diagnose diseases, recommend treatments, or prescribe medication.
4. NEVER infer medical conclusions. Only restate what is explicitly in the data.
5. This app is for information organization only. It does NOT provide medical advice.
6. When your answer uses information from specific health events (the numbered list under "Raw Health Events"), cite them. At the end of your reply, on a single line, list the event numbers you used: CITED: 1 2 3 (space-separated). Only include numbers of events you actually used. If you used no specific event (e.g. only the summary), do not add a CITED line.
7. Optionally, after your reply add exactly one line: FOLLOWUPS: question1 | question2 (two short follow-up questions the user might ask next). If no follow-ups are helpful, do not add this line. Put CITED before FOLLOWUPS if both are present.`;

function buildContext(
  events: { id: string; category: string; content: string; timestamp: string }[],
  summary: { content: string } | null,
  sessionContext: string | null
): string {
  const parts: string[] = [];

  if (summary) {
    parts.push("## Latest Summary\n" + summary.content);
  }

  if (sessionContext) {
    parts.push("## Conversation so far\n" + sessionContext);
  }

  parts.push("## Raw Health Events (chronological)\nEach event has a number in parentheses; cite these numbers when you use that event.\n");
  events.forEach((e, i) => {
    parts.push(`(${i + 1}) [${e.timestamp}] ${e.category}: ${e.content}`);
  });

  return parts.join("\n\n");
}

/** Parse CITED: 1 2 3 (or 1, 2, 3) from text; return trimmed main text and array of 1-based event indices. */
function parseCitedIds(text: string): { text: string; citedNumbers: number[] } {
  const citedMatch = text.match(/\nCITED:\s*([\d\s,]+)(?:\n|$)/i);
  if (!citedMatch) return { text: text.trim(), citedNumbers: [] };
  const citedNumbers = citedMatch[1]
    .trim()
    .split(/[\s,]+/)
    .map((s) => parseInt(s, 10))
    .filter((n) => Number.isInteger(n) && n >= 1);
  const beforeCited = text.slice(0, citedMatch.index).trim();
  return { text: beforeCited, citedNumbers };
}

export async function POST(request: Request) {
  try {
    const userId = await getUserId(request);
    let body: { message?: string; sessionId?: string | null };
    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { error: "Invalid JSON body" },
        { status: 400 }
      );
    }
    const { message, sessionId: bodySessionId } = body;

    if (!message || typeof message !== "string") {
      return NextResponse.json(
        { error: "Missing or invalid 'message' in body" },
        { status: 400 }
      );
    }

    if (!isAllowedForOpenAI(userId)) {
      return NextResponse.json(
        { error: "AI features are not available for your account." },
        { status: 403 }
      );
    }

    const [events, summary] = await Promise.all([
      getEvents(userId),
      getLatestSummary(userId),
    ]);

    let sessionId: string;
    let sessionMessages: StoredChatMessage[] = [];

    if (bodySessionId && typeof bodySessionId === "string") {
      sessionId = bodySessionId;
      sessionMessages = await getChatSessionMessages(userId, sessionId);
    } else {
      const meta = await createChatSession(
        userId,
        sessionTitleFromMessage(message)
      );
      sessionId = meta.id;
    }

    const sessionContext = buildSessionContext(sessionMessages);
    const context = buildContext(events, summary, sessionContext);

    if (!context.trim() || (events.length === 0 && !summary?.content && !sessionContext)) {
      return NextResponse.json({
        text: "I don't have any health records for you yet. Add memories (documents, notes, lab results) to get started.",
        followUps: [],
        citations: [],
        sessionId,
      });
    }

    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json({
        text: "AI is not configured. Set OPENAI_API_KEY to enable chat.",
        followUps: [],
        citations: [],
        sessionId,
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

    const textRaw = completion.choices[0]?.message?.content ?? "";
    const followUpMatch = textRaw.match(/\nFOLLOWUPS:\s*(.+)$/);
    const textAfterFollowUps = followUpMatch
      ? textRaw.slice(0, followUpMatch.index)
      : textRaw;
    const { text: textWithCited, citedNumbers } = parseCitedIds(textAfterFollowUps);
    const text = textWithCited.trim();
    const followUps: string[] = followUpMatch
      ? followUpMatch[1]
          .split("|")
          .map((s) => s.trim())
          .filter(Boolean)
          .slice(0, 2)
      : [];

    const citations = citedNumbers
      .filter((n) => n >= 1 && n <= events.length)
      .filter((n, i, a) => a.indexOf(n) === i) // dedupe
      .map((n) => {
        const e = events[n - 1];
        return {
          id: e.id,
          category: e.category,
          date: e.timestamp.slice(0, 10),
        };
      });

    const now = new Date().toISOString();
    await appendChatMessages(
      userId,
      sessionId,
      [
        { role: "user", content: message, createdAt: now },
        {
          role: "assistant",
          content: text,
          followUps,
          citations,
          createdAt: now,
        },
      ],
      {
        title: sessionMessages.length === 0 ? sessionTitleFromMessage(message) : undefined,
        updateTimestamp: true,
      }
    );

    return NextResponse.json({ text, followUps, citations, sessionId });
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
