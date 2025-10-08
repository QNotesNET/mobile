// app/api/pages/[id]/export/route.ts
import { NextResponse } from "next/server";
import { PDFDocument } from "pdf-lib";
import mongoose from "mongoose";
import connectToDB from "@/lib/mongoose";

export const runtime = "nodejs";

const PAGES_COLLECTION = "pages";

type ImageDoc = { url: string; mime?: string };
type PageDoc = { _id: unknown; pageToken?: string; token?: string; images?: ImageDoc[] };

function mimeFromUrlGuess(url: string): string {
  const u = url.toLowerCase();
  if (u.endsWith(".png")) return "image/png";
  if (u.endsWith(".jpg") || u.endsWith(".jpeg")) return "image/jpeg";
  if (u.endsWith(".webp")) return "image/webp";
  if (u.endsWith(".heic") || u.endsWith(".heif")) return "image/heic";
  return "application/octet-stream";
}
function toAbsoluteUrl(maybeUrl: string, origin: string) {
  if (/^https?:\/\//i.test(maybeUrl)) return maybeUrl;
  return new URL(maybeUrl, origin).toString();
}
async function ensureDb() {
  if (mongoose.connection.readyState !== 1) await connectToDB();
  const db = mongoose.connection.db;
  if (!db) throw new Error("Mongo connection not ready");
  return db;
}
async function getFirstImageByToken(pageToken: string): Promise<{ url: string; mimeGuess: string } | null> {
  const db = await ensureDb();
  const col = db.collection<PageDoc>(PAGES_COLLECTION);
  const page = await col.findOne(
    { $or: [{ pageToken }, { token: pageToken }] },
    { projection: { images: { $slice: 1 } } }
  );
  const img = page?.images?.[0];
  if (!img?.url) return null;
  return { url: img.url, mimeGuess: img.mime || mimeFromUrlGuess(img.url) };
}

/** Gibt garantiert ein ArrayBuffer-gestütztes Uint8Array zurück (TS-sicher getypt). */
function ensureABU8(u8: Uint8Array): Uint8Array<ArrayBuffer> {
  const buf = u8.buffer as ArrayBuffer | SharedArrayBuffer;
  if (buf instanceof ArrayBuffer) {
    const ab = buf.slice(u8.byteOffset, u8.byteOffset + u8.byteLength);
    return new Uint8Array(ab) as Uint8Array<ArrayBuffer>;
  }
  const copy = new Uint8Array(u8.byteLength);
  copy.set(u8);
  return copy as Uint8Array<ArrayBuffer>;
}

/** ArrayBuffer aus U8 (für NextResponse Body) */
function toArrayBuffer(u8: Uint8Array): ArrayBuffer {
  const buf = u8.buffer as ArrayBuffer | SharedArrayBuffer;
  if (buf instanceof ArrayBuffer) return buf.slice(u8.byteOffset, u8.byteOffset + u8.byteLength);
  const copy = new Uint8Array(u8.byteLength);
  copy.set(u8);
  return copy.buffer;
}

export async function GET(
  req: Request,
  ctx: { params: Promise<{ id: string }> } // Next 15: params ist Promise
) {
  try {
    const { id } = await ctx.params;
    const { searchParams, origin: reqOrigin } = new URL(req.url);

    // format = pdf | jpg | png  (alias: image -> jpg)
    let mode = (searchParams.get("format") || "pdf").toLowerCase();
    if (mode === "image") mode = "jpg";

    const pageToken = id;

    const asset = await getFirstImageByToken(pageToken);
    if (!asset) return new NextResponse("Page asset not found", { status: 404 });

    const baseOrigin = process.env.NEXT_PUBLIC_APP_URL || process.env.APP_URL || reqOrigin;
    const absoluteUrl = toAbsoluteUrl(asset.url, baseOrigin);

    // Quelle laden (S3/Uploads)
    const imgRes = await fetch(absoluteUrl, { cache: "no-store" });
    if (!imgRes.ok) return new NextResponse("Source fetch failed", { status: 502 });

    const srcMime = (imgRes.headers.get("content-type") || asset.mimeGuess).split(";")[0].toLowerCase();
    const srcU8_raw = new Uint8Array(await imgRes.arrayBuffer());
    const srcU8 = ensureABU8(srcU8_raw); // 🔒 jetzt Uint8Array<ArrayBuffer>

    // -------- BILD-DOWNLOAD (JPG/PNG) – konvertiert mit sharp --------
    if (mode === "jpg" || mode === "png") {
      const sharp = (await import("sharp")).default;

      if (mode === "jpg") {
        const outBuf = await sharp(srcU8).jpeg({ quality: 85 }).toBuffer();
        const outU8 = ensureABU8(new Uint8Array(outBuf.buffer, outBuf.byteOffset, outBuf.byteLength));
        return new NextResponse(toArrayBuffer(outU8), {
          status: 200,
          headers: {
            "Content-Type": "image/jpeg",
            "Content-Disposition": `attachment; filename="qnotes-page-${pageToken}.jpg"`,
            "Cache-Control": "no-store",
          },
        });
      } else {
        const outBuf = await sharp(srcU8).png({ compressionLevel: 9 }).toBuffer();
        const outU8 = ensureABU8(new Uint8Array(outBuf.buffer, outBuf.byteOffset, outBuf.byteLength));
        return new NextResponse(toArrayBuffer(outU8), {
          status: 200,
          headers: {
            "Content-Type": "image/png",
            "Content-Disposition": `attachment; filename="qnotes-page-${pageToken}.png"`,
            "Cache-Control": "no-store",
          },
        });
      }
    }

    // -------- PDF – jpg/png direkt, andere vorher nach PNG --------
    let bytesForPdf = srcU8;
    let usePng = srcMime.includes("png");

    if (!(srcMime.includes("png") || srcMime.includes("jpeg") || srcMime.includes("jpg"))) {
      const sharp = (await import("sharp")).default;
      const pngBuf = await sharp(srcU8).png().toBuffer();
      bytesForPdf = ensureABU8(new Uint8Array(pngBuf.buffer, pngBuf.byteOffset, pngBuf.byteLength));
      usePng = true;
    }

    const pdf = await PDFDocument.create();
    const page = pdf.addPage();

    const embedded = usePng
      ? await pdf.embedPng(bytesForPdf) // ✅ erwartet Uint8Array<ArrayBuffer>
      : await pdf.embedJpg(bytesForPdf); // ✅ ebenso

    const { width, height } = embedded.size();
    const pw = page.getWidth();
    const ph = page.getHeight();
    const scale = Math.min(pw / width, ph / height) * 0.92;

    page.drawImage(embedded, {
      x: (pw - width * scale) / 2,
      y: (ph - height * scale) / 2,
      width: width * scale,
      height: height * scale,
    });

    const pdfU8 = await pdf.save(); // Uint8Array (ArrayBuffer-gestützt)
    return new NextResponse(toArrayBuffer(pdfU8), {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="qnotes-page-${pageToken}.pdf"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (err) {
    console.error(err);
    return new NextResponse("Server error", { status: 500 });
  }
}
