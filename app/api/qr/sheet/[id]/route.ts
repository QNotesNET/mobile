import { NextResponse } from "next/server";
import mongoose from "mongoose";
import QRCode from "qrcode";
import { PDFDocument } from "pdf-lib";
import connectToDB from "@/lib/mongoose";
import { ObjectId } from "mongodb";

export const runtime = "nodejs";

type PageDoc = { _id: ObjectId; notebookId: ObjectId; pageIndex: number; pageToken: string };

function toArrayBuffer(u8: Uint8Array): ArrayBuffer {
  const buf = u8.buffer as ArrayBuffer | SharedArrayBuffer;
  if (buf instanceof ArrayBuffer) return buf.slice(u8.byteOffset, u8.byteOffset + u8.byteLength);
  const copy = new Uint8Array(u8.byteLength);
  copy.set(u8);
  return copy.buffer;
}

export async function GET(req: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await ctx.params;
    await connectToDB();
    const db = mongoose.connection.db!;
    const { origin } = new URL(req.url);
    const base = process.env.NEXT_PUBLIC_APP_URL || process.env.APP_URL || origin;

    const pages = await db
      .collection<PageDoc>("pages")
      .find({ notebookId: new ObjectId(id) }, { projection: { pageIndex: 1, pageToken: 1 } })
      .sort({ pageIndex: 1 })
      .toArray();

    if (!pages.length) return new NextResponse("No pages", { status: 404 });

    const qrEntries: { idx: number; u8: Uint8Array }[] = [];
    for (const p of pages) {
      const scanUrl = new URL(`/s/${encodeURIComponent(p.pageToken)}`, base).toString();
      const buf = await QRCode.toBuffer(scanUrl, {
        type: "png",
        errorCorrectionLevel: "M",
        margin: 1,
        width: 640,
        color: { dark: "#000000", light: "#ffffff" },
      });
      qrEntries.push({ idx: p.pageIndex, u8: new Uint8Array(buf) });
    }

    // PDF mit 12 QR-Codes pro Seite (A4)
    const pdf = await PDFDocument.create();
    const pageMargin = 36;
    const cols = 3, rows = 4, cellGap = 8;

    let i = 0;
    while (i < qrEntries.length) {
      const pg = pdf.addPage([595.28, 841.89]); // A4 (pt)
      const pw = pg.getWidth(), ph = pg.getHeight();
      const innerW = pw - pageMargin * 2;
      const innerH = ph - pageMargin * 2;
      const cellW = (innerW - cellGap * (cols - 1)) / cols;
      const cellH = (innerH - cellGap * (rows - 1)) / rows;

      for (let r = 0; r < rows && i < qrEntries.length; r++) {
        for (let c = 0; c < cols && i < qrEntries.length; c++) {
          const e = qrEntries[i++];
          const img = await pdf.embedPng(e.u8);
          const labelH = 14;
          const qrSize = Math.min(cellW, cellH - labelH - 4);
          const x = pageMargin + c * (cellW + cellGap);
          const y = ph - pageMargin - (r + 1) * cellH - r * cellGap;

          pg.drawImage(img, { x: x + (cellW - qrSize) / 2, y: y + (cellH - labelH - qrSize) / 2 + labelH, width: qrSize, height: qrSize });
          pg.drawText(`Seite ${e.idx}`, { x: x + 4, y: y + 4, size: 10 });
        }
      }
    }

    const pdfU8 = await pdf.save();
    return new NextResponse(toArrayBuffer(pdfU8), {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="qnotes-qr-sheet-${id}.pdf"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (e) {
    console.error(e);
    return new NextResponse("Server error", { status: 500 });
  }
}
