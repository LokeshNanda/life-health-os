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

function buildSummaryPDF(
  content: string,
  version: number,
  createdAt: string
): ArrayBuffer {
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const margin = 14;
  const pageWidth = 210;
  const pageHeight = 297;
  const bottomMargin = 20;
  const maxY = pageHeight - bottomMargin;
  const lineHeight = 6;
  let y = margin;

  doc.setFontSize(16);
  doc.text("Health Memory — Summary", margin, y);
  y += lineHeight * 2;
  doc.setFontSize(10);
  doc.text(`Version ${version} · ${createdAt}`, margin, y);
  y += lineHeight * 1.5;

  doc.setFontSize(9);
  const summaryLines = doc.splitTextToSize(content, pageWidth - margin * 2);
  for (const line of summaryLines) {
    if (y > maxY) {
      doc.addPage();
      y = margin;
    }
    doc.text(line, margin, y);
    y += lineHeight;
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
