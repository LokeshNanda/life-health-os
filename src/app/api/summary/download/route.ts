/**
 * GET /api/summary/download
 * Returns the latest summary as PDF or Markdown.
 * Query: format=pdf|md (default: pdf)
 */

import { NextResponse } from "next/server";
import { getUserId } from "@/lib/auth";
import { getLatestSummary, getSummaryByVersion } from "@/lib/data";
import { jsPDF } from "jspdf";

const FILENAME_PREFIX = "health-memory-summary";

const FOOTER_HEIGHT = 12;
const PAGE_HEIGHT = 297;
const PAGE_WIDTH = 210;
const MARGIN = 18;
const CONTENT_WIDTH = PAGE_WIDTH - MARGIN * 2;
const BODY_LINE = 5.5;
const TITLE_SIZE = 18;
const SUBTITLE_SIZE = 11;
const SECTION_SIZE = 12;
const BODY_SIZE = 10;

/** Renders footer on current page and reserves space so content stays above it. */
function addFooter(doc: jsPDF, pageNum: number, totalPages: number, title: string): void {
  const y = PAGE_HEIGHT - FOOTER_HEIGHT;
  doc.setDrawColor(200, 200, 200);
  doc.setLineWidth(0.2);
  doc.line(MARGIN, y - 2, PAGE_WIDTH - MARGIN, y - 2);
  doc.setFontSize(8);
  doc.setTextColor(120, 120, 120);
  doc.text(title, MARGIN, y + 4);
  doc.text(totalPages > 0 ? `Page ${pageNum} of ${totalPages}` : `Page ${pageNum}`, PAGE_WIDTH - MARGIN, y + 4, { align: "right" });
  doc.setTextColor(0, 0, 0);
}

/** Split summary content into blocks: section headers (## or ###) vs body paragraphs. */
function getSummaryBlocks(content: string): { type: "h2" | "h3" | "p"; text: string }[] {
  const blocks: { type: "h2" | "h3" | "p"; text: string }[] = [];
  const lines = content.split(/\r?\n/);
  let i = 0;
  while (i < lines.length) {
    const line = lines[i];
    const trimmed = line.trim();
    if (/^##\s+/.test(trimmed)) {
      blocks.push({ type: "h2", text: trimmed.replace(/^##\s+/, "").trim() });
      i++;
    } else if (/^###\s+/.test(trimmed)) {
      blocks.push({ type: "h3", text: trimmed.replace(/^###\s+/, "").trim() });
      i++;
    } else if (trimmed) {
      const para: string[] = [trimmed];
      i++;
      while (i < lines.length && lines[i].trim() && !/^#+\s+/.test(lines[i].trim())) {
        para.push(lines[i].trim());
        i++;
      }
      blocks.push({ type: "p", text: para.join(" ") });
    } else {
      i++;
    }
  }
  return blocks;
}

function buildSummaryPDF(
  content: string,
  version: number,
  createdAt: string
): ArrayBuffer {
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const maxY = PAGE_HEIGHT - MARGIN - FOOTER_HEIGHT;
  let y = MARGIN;
  let pageNum = 1;

  // Title block
  doc.setFontSize(TITLE_SIZE);
  doc.setFont("helvetica", "bold");
  doc.text("Health Memory — Summary", MARGIN, y);
  y += BODY_LINE * 2;
  doc.setFontSize(SUBTITLE_SIZE);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(80, 80, 80);
  doc.text(`Version ${version}  ·  ${createdAt}`, MARGIN, y);
  doc.setTextColor(0, 0, 0);
  y += BODY_LINE * 1.5;
  doc.setDrawColor(200, 200, 200);
  doc.setLineWidth(0.3);
  doc.line(MARGIN, y, PAGE_WIDTH - MARGIN, y);
  y += BODY_LINE * 1.5;

  const blocks = getSummaryBlocks(content);
  doc.setFontSize(BODY_SIZE);

  for (const block of blocks) {
    if (block.type === "h2") {
      if (y + BODY_LINE * 2 > maxY) {
        addFooter(doc, pageNum, 0, "Health Memory — Summary");
        doc.addPage();
        pageNum++;
        y = MARGIN;
      }
      doc.setFontSize(SECTION_SIZE);
      doc.setFont("helvetica", "bold");
      doc.text(block.text, MARGIN, y);
      y += BODY_LINE * 1.2;
      doc.setFont("helvetica", "normal");
      doc.setFontSize(BODY_SIZE);
    } else if (block.type === "h3") {
      if (y + BODY_LINE * 1.5 > maxY) {
        addFooter(doc, pageNum, 0, "Health Memory — Summary");
        doc.addPage();
        pageNum++;
        y = MARGIN;
      }
      doc.setFont("helvetica", "bold");
      doc.setFontSize(BODY_SIZE + 1);
      doc.text(block.text, MARGIN, y);
      y += BODY_LINE;
      doc.setFont("helvetica", "normal");
      doc.setFontSize(BODY_SIZE);
    } else {
      const lines = doc.splitTextToSize(block.text, CONTENT_WIDTH);
      for (const line of lines) {
        if (y > maxY) {
          addFooter(doc, pageNum, 0, "Health Memory — Summary");
          doc.addPage();
          pageNum++;
          y = MARGIN;
        }
        doc.text(line, MARGIN, y);
        y += BODY_LINE;
      }
      y += BODY_LINE * 0.3;
    }
  }

  const totalPages = doc.getNumberOfPages();
  for (let p = 1; p <= totalPages; p++) {
    doc.setPage(p);
    addFooter(doc, p, totalPages, "Health Memory — Summary");
  }

  return doc.output("arraybuffer");
}

function buildSummaryMarkdown(content: string, version: number, createdAt: string): string {
  return `# Health Memory — Summary\n\n**Version ${version}** · ${createdAt}\n\n---\n\n${content}\n`;
}

export async function GET(request: Request) {
  try {
    const userId = await getUserId(request);
    const { searchParams } = new URL(request.url);
    const format = (searchParams.get("format") ?? "pdf").toLowerCase();
    const versionParam = searchParams.get("version");
    const requestedVersion =
      versionParam != null ? parseInt(versionParam, 10) : null;

    const summary =
      requestedVersion != null && Number.isInteger(requestedVersion)
        ? await getSummaryByVersion(userId, requestedVersion)
        : await getLatestSummary(userId);

    if (!summary) {
      return NextResponse.json(
        { error: "No summary found. Run summarization first." },
        { status: 404 }
      );
    }

    const dateStr = new Date().toISOString().slice(0, 10);
    const createdAt = new Date(summary.createdAt).toISOString();

    if (format === "md" || format === "markdown") {
      const md = buildSummaryMarkdown(summary.content, summary.version, createdAt);
      const filename = `${FILENAME_PREFIX}-v${summary.version}-${dateStr}.md`;
      return new NextResponse(md, {
        status: 200,
        headers: {
          "Content-Type": "text/markdown; charset=utf-8",
          "Content-Disposition": `attachment; filename="${filename}"`,
        },
      });
    }

    // default: pdf
    const buffer = buildSummaryPDF(summary.content, summary.version, createdAt);
    const filename = `${FILENAME_PREFIX}-v${summary.version}-${dateStr}.pdf`;
    return new NextResponse(buffer, {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    });
  } catch (err) {
    if (err instanceof Error && err.message.includes("Unauthorized")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    console.error("Summary download error:", err);
    return NextResponse.json(
      { error: "Failed to download summary" },
      { status: 500 }
    );
  }
}
