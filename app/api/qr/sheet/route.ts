// app/api/qr/sheet/route.ts
import { NextResponse } from "next/server";
import { PDFDocument, rgb } from "pdf-lib";
import { buildNotebookClaimUrl, qrDataUrlFromText } from "@/lib/qr";

async function tokenFor(notebookId: string) {
  // TODO: Serien-Token pro Code (optional)
  return `sheet-token-${notebookId}-${Math.random().toString(36).slice(2)}`;
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const notebookId = searchParams.get("notebookId");
  const perPage = Number(searchParams.get("perPage") || 24);
  if (!notebookId) return new NextResponse("notebookId required", { status: 400 });

  const pdf = await PDFDocument.create();
  const page = pdf.addPage([595, 842]); // A4 portrait in points
  const cols = 4, rows = 6;
  const count = Math.min(perPage, cols * rows);

  const padding = 24;
  const cellW = (595 - padding * 2) / cols;
  const cellH = (842 - padding * 2) / rows;
  const qrSize = Math.min(cellW, cellH) - 18;

  for (let i = 0; i < count; i++) {
    const token = await tokenFor(notebookId);
    const url = buildNotebookClaimUrl(token);
    const dataUrl = await qrDataUrlFromText(url);

    const pngBytes = Buffer.from(dataUrl.split(",")[1], "base64");
    const img = await pdf.embedPng(pngBytes);

    const c = i % cols;
    const r = Math.floor(i / cols);
    const x = padding + c * cellW + (cellW - qrSize) / 2;
    const y = 842 - padding - (r + 1) * cellH + (cellH - qrSize) / 2;

    page.drawRectangle({ x: x - 6, y: y - 6, width: qrSize + 12, height: qrSize + 12, color: rgb(0.96, 0.96, 0.96) });
    page.drawImage(img, { x, y, width: qrSize, height: qrSize });
  }

  const bytes = await pdf.save();
  return new NextResponse(Buffer.from(bytes), {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="qnotes-qr-${notebookId}.pdf"`,
      "Cache-Control": "no-store",
    },
  });
}
