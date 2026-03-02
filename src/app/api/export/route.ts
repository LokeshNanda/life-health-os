/**
 * GET /api/export
 * Returns user's health events and latest summary for export.
 * Query: format=json|csv|pdf (default: json)
 */

import { NextResponse } from "next/server";
import { getUserId } from "@/lib/auth";
import { getEvents, getLatestSummary, getProfile, getSummaryVersions, getSummaryByVersion } from "@/lib/data";
import type { HealthEvent } from "@/lib/types";
import { jsPDF } from "jspdf";

const EXPORT_FILENAME_PREFIX = "health-memory-export";

function getExportFilename(format: string, forProvider?: boolean): string {
  const dateStr = new Date().toISOString().slice(0, 10);
  if (forProvider && format === "pdf") {
    return `health-memory-for-provider-${dateStr}.pdf`;
  }
  return `${EXPORT_FILENAME_PREFIX}-${dateStr}.${format === "csv" ? "csv" : format === "pdf" ? "pdf" : "json"}`;
}

/** Format ISO date for display in PDF (e.g. "March 2, 2026, 11:44 AM"). */
function formatDateForPdf(iso: string): string {
  try {
    const d = new Date(iso);
    const date = d.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });
    const time = d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true });
    return `${date}, ${time}`;
  } catch {
    return iso.slice(0, 10);
  }
}

/** Parse markdown-like summary into blocks: h3, h4, or paragraph lines (preserve newlines for lists). */
function parseSummaryBlocks(content: string): { type: "h3" | "h4" | "p"; text?: string; lines?: string[] }[] {
  const blocks: { type: "h3" | "h4" | "p"; text?: string; lines?: string[] }[] = [];
  const lines = content.split(/\r?\n/);
  let i = 0;
  while (i < lines.length) {
    const line = lines[i];
    const trimmed = line.trim();
    if (/^###\s+/.test(trimmed)) {
      blocks.push({ type: "h3", text: trimmed.replace(/^###\s+/, "").trim() });
      i++;
    } else if (/^####\s+/.test(trimmed)) {
      blocks.push({ type: "h4", text: trimmed.replace(/^####\s+/, "").trim() });
      i++;
    } else if (trimmed) {
      const paraLines: string[] = [trimmed];
      i++;
      while (i < lines.length && !/^#+\s+/.test(lines[i].trim())) {
        if (lines[i].trim()) paraLines.push(lines[i].trim());
        i++;
      }
      blocks.push({ type: "p", lines: paraLines });
    } else {
      i++;
    }
  }
  return blocks;
}

/** Split text into segments of normal vs bold (from **...**). Returns list of { bold, text }. */
function getBoldSegments(text: string): { bold: boolean; text: string }[] {
  const segments: { bold: boolean; text: string }[] = [];
  let rest = text;
  let bold = false;
  while (rest.length > 0) {
    const idx = rest.indexOf("**");
    if (idx === -1) {
      segments.push({ bold, text: rest });
      break;
    }
    if (idx > 0) segments.push({ bold, text: rest.slice(0, idx) });
    bold = !bold;
    rest = rest.slice(idx + 2);
  }
  return segments;
}

/**
 * Draw summary content with markdown-style headings and bold, with wrapping.
 * Preserves line breaks so list items (lab results, medications) each get their own line(s).
 */
function drawProviderSummaryContent(
  doc: jsPDF,
  content: string,
  opts: {
    margin: number;
    contentWidth: number;
    lineHeight: number;
    maxY: number;
    addFooter: () => void;
    getY: () => number;
    setY: (y: number) => void;
  }
): void {
  const { margin, contentWidth, lineHeight, maxY, addFooter, getY, setY } = opts;
  const blocks = parseSummaryBlocks(content);
  const listIndent = 5; // mm for bullet/numbered lines

  const getTextWidth = (text: string, bold: boolean): number => {
    doc.setFont("helvetica", bold ? "bold" : "normal");
    return doc.getTextWidth(text);
  };

  const drawLineSegments = (segments: { bold: boolean; text: string }[], xStart: number): void => {
    let x = xStart;
    for (const seg of segments) {
      doc.setFont("helvetica", seg.bold ? "bold" : "normal");
      doc.text(seg.text, x, getY());
      x += getTextWidth(seg.text, seg.bold);
    }
  };

  /** Draw one line of text (may wrap to multiple PDF lines) with **bold** support. */
  const drawOneLine = (
    lineText: string,
    xStart: number,
    maxWidth: number
  ): void => {
    const segments = getBoldSegments(lineText);
    const atoms: { bold: boolean; word: string }[] = [];
    for (const seg of segments) {
      const words = seg.text.split(/\s+/).filter(Boolean);
      for (const w of words) atoms.push({ bold: seg.bold, word: w });
    }

    let lineSegments: { bold: boolean; text: string }[] = [];
    let lineWidth = 0;

    for (let i = 0; i < atoms.length; i++) {
      const atom = atoms[i];
      const word = atom.word + (i < atoms.length - 1 ? " " : "");
      const w = getTextWidth(word, atom.bold);

      if (lineWidth + w > maxWidth && lineSegments.length > 0) {
        let y = getY();
        if (y > maxY) {
          addFooter();
          doc.addPage();
          setY(margin);
          y = margin;
        }
        doc.setFontSize(10);
        drawLineSegments(lineSegments, xStart);
        setY(y + lineHeight);
        lineSegments = [];
        lineWidth = 0;
      }

      if (lineSegments.length > 0 && lineSegments[lineSegments.length - 1].bold === atom.bold) {
        lineSegments[lineSegments.length - 1].text += (lineSegments[lineSegments.length - 1].text ? " " : "") + atom.word;
      } else {
        lineSegments.push({ bold: atom.bold, text: atom.word });
      }
      lineWidth += w;
    }

    if (lineSegments.length > 0) {
      let y = getY();
      if (y > maxY) {
        addFooter();
        doc.addPage();
        setY(margin);
        y = margin;
      }
      doc.setFontSize(10);
      drawLineSegments(lineSegments, xStart);
      setY(y + lineHeight);
    }
  };

  for (const block of blocks) {
    let y = getY();

    if (block.type === "h3") {
      const text = block.text?.trim();
      if (!text) continue;
      if (y + lineHeight * 1.8 > maxY) {
        addFooter();
        doc.addPage();
        setY(margin);
        y = margin;
      }
      doc.setFontSize(11);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(40, 40, 40);
      doc.text(text, margin, y);
      doc.setTextColor(0, 0, 0);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(10);
      setY(y + lineHeight * 1.4);
      continue;
    }

    if (block.type === "h4") {
      const text = block.text?.trim();
      if (!text) continue;
      if (y + lineHeight * 1.4 > maxY) {
        addFooter();
        doc.addPage();
        setY(margin);
        y = margin;
      }
      doc.setFontSize(10);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(50, 50, 50);
      doc.text(text, margin, y);
      doc.setTextColor(0, 0, 0);
      doc.setFont("helvetica", "normal");
      setY(y + lineHeight * 1.2);
      continue;
    }

    // Paragraph: each source line on its own line(s) in the PDF; indent list items
    if (block.type === "p" && block.lines) {
      for (let lineIndex = 0; lineIndex < block.lines.length; lineIndex++) {
        const line = block.lines[lineIndex];
        if (!line.trim()) continue;
        const isListItem = /^[-•]\s+/.test(line) || /^\d+[.)]\s+/.test(line);
        const xStart = margin + (isListItem ? listIndent : 0);
        const lineMaxWidth = contentWidth - (isListItem ? listIndent : 0);
        drawOneLine(line, xStart, lineMaxWidth);
        // Slight extra space after each line (skip for last line to avoid pushing past maxY and creating a blank next page)
        const isLastLine = lineIndex === block.lines.length - 1;
        if (!isLastLine) setY(getY() + lineHeight * 0.15);
      }
    }
  }
}

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
  exportedAt: string,
  forProvider: boolean
): ArrayBuffer {
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const margin = 18;
  const pageWidth = 210;
  const pageHeight = 297;
  const footerHeight = 12;
  const maxY = pageHeight - margin - footerHeight;
  const lineHeight = 5.5;
  const contentWidth = pageWidth - margin * 2;
  let y = margin;
  let pageNum = 1;

  function addFooter(title: string): void {
    const total = doc.getNumberOfPages();
    const yFoot = pageHeight - footerHeight;
    doc.setDrawColor(200, 200, 200);
    doc.setLineWidth(0.2);
    doc.line(margin, yFoot - 2, pageWidth - margin, yFoot - 2);
    doc.setFontSize(8);
    doc.setTextColor(120, 120, 120);
    doc.text(title, margin, yFoot + 4);
    doc.text(`Page ${pageNum} of ${total}`, pageWidth - margin, yFoot + 4, { align: "right" });
    doc.setTextColor(0, 0, 0);
  }

  function checkPageBreak(requiredHeight: number): void {
    if (y + requiredHeight > maxY) {
      addFooter(forProvider ? "Health Memory — For Healthcare Provider" : "Health Memory — Export");
      doc.addPage();
      pageNum++;
      y = margin;
    }
  }

  // Helper: add a new page (used only from summary content when we're about to draw).
  function addPageAndResetY(): void {
    doc.addPage();
    pageNum++;
    y = margin;
  }

  // —— Provider PDF: summarized quick review (no raw event text) ——
  if (forProvider) {
    doc.setFillColor(248, 250, 252);
    doc.rect(0, 0, pageWidth, 32, "F");
    doc.setDrawColor(203, 213, 225);
    doc.setLineWidth(0.3);
    doc.line(0, 32, pageWidth, 32);
    doc.setFontSize(15);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(15, 23, 42);
    doc.text("For Healthcare Provider — Quick Review", margin, 14);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(71, 85, 105);
    doc.text(`Patient-provided health summary. Generated: ${formatDateForPdf(exportedAt)}`, margin, 24);
    doc.setTextColor(0, 0, 0);
    y = 42;

    if (summary?.content) {
      doc.setFontSize(14);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(30, 41, 59);
      doc.text("Clinical Summary", margin, y);
      y += lineHeight * 1.3;
      doc.setFontSize(9);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(100, 116, 139);
      doc.text(`Version ${summary.version} · Condensed from patient records`, margin, y);
      doc.setTextColor(0, 0, 0);
      y += lineHeight * 1.4;

      doc.setDrawColor(226, 232, 240);
      doc.setLineWidth(0.25);
      doc.line(margin, y, pageWidth - margin, y);
      y += lineHeight * 1.2;

      const getY = () => y;
      const setY = (v: number) => {
        y = v;
      };
      drawProviderSummaryContent(doc, summary.content, {
        margin,
        contentWidth,
        lineHeight,
        maxY,
        addFooter: () => {
          addPageAndResetY();
          setY(y);
        },
        getY,
        setY,
      });
      y = getY();
      y += lineHeight * 0.8;
    } else {
      doc.setFontSize(11);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(80, 80, 80);
      doc.text("No clinical summary available. Patient has not run Summarize yet.", margin, y);
      y += lineHeight;
      doc.text(`This export includes ${events.length} raw event(s) as timeline only (no full text).`, margin, y);
      doc.setTextColor(0, 0, 0);
      y += lineHeight * 1.5;
    }

    // At a glance: counts by category and date range
    const categoryCounts = events.reduce<Record<string, number>>((acc, e) => {
      acc[e.category] = (acc[e.category] ?? 0) + 1;
      return acc;
    }, {});
    const categories = Object.keys(categoryCounts).sort();
    const dateRange =
      events.length > 0
        ? (() => {
            const dates = events.map((e) => e.timestamp.slice(0, 10));
            return `${dates.reduce((a, b) => (a < b ? a : b))} – ${dates.reduce((a, b) => (a > b ? a : b))}`;
          })()
        : "—";

    checkPageBreak(lineHeight * 7);

    doc.setDrawColor(226, 232, 240);
    doc.setLineWidth(0.2);
    doc.line(margin, y, pageWidth - margin, y);
    y += lineHeight * 1.2;

    doc.setFontSize(11);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(30, 41, 59);
    doc.text("At a glance", margin, y);
    y += lineHeight * 1.2;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.setTextColor(51, 65, 85);
    doc.text(`${events.length} event(s)  ·  Date range: ${dateRange}`, margin, y);
    y += lineHeight;
    if (categories.length > 0) {
      const byCategory = categories
        .map((c) => `${c.replace(/_/g, " ")} (${categoryCounts[c]})`)
        .join("  ·  ");
      const catLines = doc.splitTextToSize(byCategory, contentWidth);
      catLines.forEach((line: string) => {
        doc.text(line, margin, y);
        y += lineHeight;
      });
      y += lineHeight * 0.8;
    }
    doc.setTextColor(0, 0, 0);

    // Compact timeline: date + category only (no raw content)
    if (events.length > 0) {
      checkPageBreak(lineHeight * 3);
      doc.setFontSize(11);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(30, 41, 59);
      doc.text("Timeline (date & category only)", margin, y);
      y += lineHeight;
      doc.setFont("helvetica", "normal");
      doc.setFontSize(9);
      doc.setTextColor(100, 116, 139);
      doc.text("Date", margin, y);
      doc.text("Category", margin + 38, y);
      y += lineHeight * 0.8;
      doc.setDrawColor(226, 232, 240);
      doc.setLineWidth(0.15);
      doc.line(margin, y, pageWidth - margin, y);
      y += lineHeight * 0.5;
      doc.setTextColor(0, 0, 0);

      const sortedEvents = [...events].sort((a, b) => a.timestamp.localeCompare(b.timestamp));
      for (const e of sortedEvents) {
        checkPageBreak(lineHeight + 2);
        const dateStr = e.timestamp.slice(0, 10);
        const categoryStr = e.category.replace(/_/g, " ");
        doc.text(dateStr, margin, y);
        doc.text(categoryStr, margin + 38, y);
        y += lineHeight + 0.4;
      }
    }

    const totalPages = doc.getNumberOfPages();
    for (let p = 1; p <= totalPages; p++) {
      doc.setPage(p);
      pageNum = p;
      addFooter("Health Memory — For Healthcare Provider");
    }
    return doc.output("arraybuffer");
  }

  // —— Standard export PDF: full timeline with content ——
  doc.setFontSize(16);
  doc.setFont("helvetica", "bold");
  doc.text("Health Memory — Timeline Export", margin, y);
  y += lineHeight * 2;
  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(80, 80, 80);
  doc.text(`Exported: ${exportedAt}`, margin, y);
  doc.setTextColor(0, 0, 0);
  y += lineHeight * 1.5;

  doc.setFontSize(12);
  doc.setFont("helvetica", "bold");
  doc.text("Events", margin, y);
  y += lineHeight * 1.2;

  const dateCol = 32;
  const categoryCol = 38;
  const contentCol = contentWidth - dateCol - categoryCol;
  const maxContentLen = 140;

  for (const e of events) {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    const dateStr = e.timestamp.slice(0, 10);
    const categoryStr = e.category.replace(/_/g, " ") + (e.tags?.length ? ` (${e.tags.join(", ")})` : "");
    const contentSnippet =
      e.content.length <= maxContentLen ? e.content : e.content.slice(0, maxContentLen) + "…";
    const contentLines = doc.splitTextToSize(contentSnippet, contentCol);
    const blockHeight = lineHeight * Math.max(1, contentLines.length) + 3;

    checkPageBreak(blockHeight);

    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.text(dateStr, margin, y);
    doc.text(categoryStr, margin + dateCol, y);
    doc.setFont("helvetica", "normal");
    doc.text(contentLines, margin + dateCol + categoryCol, y);
    y += blockHeight;
  }

  if (summary && summary.content) {
    checkPageBreak(lineHeight * 3);

    y += lineHeight * 0.5;
    doc.setFontSize(12);
    doc.setFont("helvetica", "bold");
    doc.text(`Summary (v${summary.version})`, margin, y);
    y += lineHeight * 1.2;

    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    const summaryLines = doc.splitTextToSize(summary.content, contentWidth);
    for (const line of summaryLines) {
      if (y > maxY) {
        addFooter("Health Memory — Export");
        doc.addPage();
        pageNum++;
        y = margin;
      }
      doc.text(line, margin, y);
      y += lineHeight;
    }
  }

  const totalPages = doc.getNumberOfPages();
  for (let p = 1; p <= totalPages; p++) {
    doc.setPage(p);
    pageNum = p;
    addFooter("Health Memory — Export");
  }

  return doc.output("arraybuffer");
}

export async function GET(request: Request) {
  try {
    const userId = await getUserId(request);
    const { searchParams } = new URL(request.url);
    const format = (searchParams.get("format") ?? "json").toLowerCase();
    const forProvider = searchParams.get("for") === "provider";

    const [events, summary] = await Promise.all([
      getEvents(userId),
      getLatestSummary(userId),
    ]);

    const summaryPayload = summary
      ? { content: summary.content, version: summary.version, createdAt: summary.createdAt }
      : null;

    if (format === "csv") {
      const csv = buildCSV(events, summaryPayload);
      const filename = getExportFilename("csv", forProvider);
      return new NextResponse(csv, {
        status: 200,
        headers: {
          "Content-Type": "text/csv; charset=utf-8",
          "Content-Disposition": `attachment; filename="${filename}"`,
        },
      });
    }

    if (format === "pdf") {
      const buffer = buildPDF(events, summaryPayload, new Date().toISOString(), forProvider);
      const filename = getExportFilename("pdf", forProvider);
      return new NextResponse(buffer, {
        status: 200,
        headers: {
          "Content-Type": "application/pdf",
          "Content-Disposition": `attachment; filename="${filename}"`,
        },
      });
    }

    // default: json — full data portability (GDPR-style)
    const profile = await getProfile(userId);
    const versionNumbers = await getSummaryVersions(userId);
    const summaries = await Promise.all(
      versionNumbers.map((v) => getSummaryByVersion(userId, v))
    ).then((arr) => arr.filter(Boolean));
    const payload = {
      exportedAt: new Date().toISOString(),
      exportType: "full" as const,
      description:
        "Full export of your health memory data (events, summaries, profile). Use for backup or data portability (e.g. GDPR Article 20).",
      events,
      summary: summaryPayload,
      summaries: summaries.map((s) => ({
        version: s!.version,
        content: s!.content,
        createdAt: s!.createdAt,
        sizeBefore: s!.sizeBefore,
        sizeAfter: s!.sizeAfter,
      })),
      profile: profile ?? undefined,
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
