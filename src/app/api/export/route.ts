/**
 * GET /api/export
 * Returns user's health events and latest summary for export.
 * Query: format=json|csv|pdf (default: json)
 */

import { NextResponse } from "next/server";
import { getUserId } from "@/lib/auth";
import { getEvents, getLatestSummary } from "@/lib/data";
import type { HealthEvent } from "@/lib/types";
import { jsPDF } from "jspdf";

const EXPORT_FILENAME_PREFIX = "health-memory-export";

function csvEscape(value: string): string {
  if (/[",\r\n]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

function buildCSV(events: HealthEvent[], summary: { content: string; version: number; createdAt: string } | null): string {
  const header = "Date,Category,Tags,Content,ID";
  const rows = events.map((e) =>
    [
      e.timestamp.slice(0, 19).replace("T", " "),
      e.category,
      csvEscape(Array.isArray(e.tags) ? e.tags.join("; ") : ""),
      csvEscape(e.content),
      e.id,
    ].join(",")
  );
  const lines = [header, ...rows];
  if (summary) {
    lines.push("");
    lines.push("Summary (version " + summary.version + ", created " + summary.createdAt + ")");
    lines.push(csvEscape(summary.content));
  }
  return lines.join("\r\n");
}

function buildPDF(
  events: HealthEvent[],
  summary: { content: string; version: number; createdAt: string } | null,
  exportedAt: string
): ArrayBuffer {
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const margin = 14;
  const pageWidth = 210; // A4 width in mm
  const pageHeight = 297; // A4 height in mm
  const bottomMargin = 20;
  const maxY = pageHeight - bottomMargin;
  const lineHeight = 6;
  let y = margin;

  function checkPageBreak(requiredHeight: number): void {
    if (y + requiredHeight > maxY) {
      doc.addPage();
      y = margin;
    }
  }

  doc.setFontSize(16);
  doc.text("Health Memory — Timeline Export", margin, y);
  y += lineHeight * 2;
  doc.setFontSize(10);
  doc.text(`Exported: ${exportedAt}`, margin, y);
  y += lineHeight * 1.5;

  doc.setFontSize(11);
  doc.text("Events", margin, y);
  y += lineHeight;

  const colWidths = [38, 32, pageWidth - margin * 2 - 38 - 32];
  const maxContentLen = 120;

  for (const e of events) {
    doc.setFontSize(9);
    const dateStr = e.timestamp.slice(0, 10);
    const categoryStr = e.category.replace(/_/g, " ") + (e.tags?.length ? ` (${e.tags.join(", ")})` : "");
    const contentSnippet =
      e.content.length <= maxContentLen ? e.content : e.content.slice(0, maxContentLen) + "…";
    const contentLines = doc.splitTextToSize(contentSnippet, colWidths[2]);
    const blockHeight = lineHeight * Math.max(1, contentLines.length) + 2;

    checkPageBreak(blockHeight);

    doc.text(dateStr, margin, y);
    doc.text(categoryStr, margin + colWidths[0], y);
    doc.text(contentLines, margin + colWidths[0] + colWidths[1], y);
    y += blockHeight;
  }

  if (summary && summary.content) {
    const summaryTitleHeight = lineHeight * 2;
    checkPageBreak(summaryTitleHeight);

    y += lineHeight;
    doc.setFontSize(11);
    doc.text("Summary (v" + summary.version + ")", margin, y);
    y += lineHeight;

    doc.setFontSize(9);
    const summaryLines = doc.splitTextToSize(summary.content, pageWidth - margin * 2);
    for (const line of summaryLines) {
      if (y > maxY) {
        doc.addPage();
        y = margin;
      }
      doc.text(line, margin, y);
      y += lineHeight;
    }
  }

  return doc.output("arraybuffer");
}

export async function GET(request: Request) {
  try {
    const userId = await getUserId(request);
    const { searchParams } = new URL(request.url);
    const format = (searchParams.get("format") ?? "json").toLowerCase();
    const dateStr = new Date().toISOString().slice(0, 10);

    const [events, summary] = await Promise.all([
      getEvents(userId),
      getLatestSummary(userId),
    ]);

    const summaryPayload = summary
      ? { content: summary.content, version: summary.version, createdAt: summary.createdAt }
      : null;

    if (format === "csv") {
      const csv = buildCSV(events, summaryPayload);
      const filename = `${EXPORT_FILENAME_PREFIX}-${dateStr}.csv`;
      return new NextResponse(csv, {
        status: 200,
        headers: {
          "Content-Type": "text/csv; charset=utf-8",
          "Content-Disposition": `attachment; filename="${filename}"`,
        },
      });
    }

    if (format === "pdf") {
      const buffer = buildPDF(events, summaryPayload, new Date().toISOString());
      const filename = `${EXPORT_FILENAME_PREFIX}-${dateStr}.pdf`;
      return new NextResponse(buffer, {
        status: 200,
        headers: {
          "Content-Type": "application/pdf",
          "Content-Disposition": `attachment; filename="${filename}"`,
        },
      });
    }

    // default: json
    const payload = {
      exportedAt: new Date().toISOString(),
      exportType: "full" as const,
      description:
        "Full export of your health memory data (events and summary). Use for backup or data portability (e.g. GDPR).",
      events,
      summary: summaryPayload,
    };
    return NextResponse.json(payload);
  } catch (err) {
    if (err instanceof Error && err.message.includes("Unauthorized")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    console.error("Export error:", err);
    return NextResponse.json({ error: "Failed to export" }, { status: 500 });
  }
}
