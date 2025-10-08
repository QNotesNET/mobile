// app/api/pages/[id]/export/route.ts
import { NextResponse } from "next/server";
import { PDFDocument } from "pdf-lib";

// TODO: Hole Page-Asset aus DB/Storage
async function getPageAsset(id: string) {
  // Demo: irgendein öffentliches PNG/WEBP/JPG; ersetze durch S3 URL etc.
  const demo = "https://upload.wikimedia.org/wikipedia/commons/thumb/a/a9/Example.jpg/640px-Example.jpg";
  return { url: demo, mime: "image/jpeg" };
}

export async function GET(req: Request, { params }: { params: { id: string } }) {
  const { searchParams } = new URL(req.url);
  const format = (searchParams.get("format") || "pdf").toLowerCase(); // "pdf" | "png"
  const pageId = params.id;

  const asset = await getPageAsset(pageId);
  if (!asset) return new NextResponse("Not found", { status: 404 });

  // PNG Download: einfach durchreichen (oder mit sharp konvertieren)
  if (format === "png") {
    const imgRes = await fetch(asset.url);
    if (!imgRes.ok) return new NextResponse("Fetch failed", { status: 502 });
    const buf = Buffer.from(await imgRes.arrayBuffer());
    return new NextResponse(buf, {
      status: 200,
      headers: {
        "Content-Type": "image/png", // wenn Original kein PNG ist -> optional sharp konvertieren
        "Content-Disposition": `attachment; filename="qnotes-page-${pageId}.png"`,
        "Cache-Control": "no-store",
      },
    });
  }

  // PDF Download: Bild einbetten
  const imgRes = await fetch(asset.url);
  if (!imgRes.ok) return new NextResponse("Fetch failed", { status: 502 });
  const imgBytes = Buffer.from(await imgRes.arrayBuffer());

  const pdf = await PDFDocument.create();
  const page = pdf.addPage(); // auto size; wir skalieren Bild auf Seite

  let embedded;
  const ct = asset.mime.toLowerCase();
  if (ct.includes("png")) embedded = await pdf.embedPng(imgBytes);
  else embedded = await pdf.embedJpg(imgBytes);

  const { width, height } = embedded.size();
  const pw = page.getWidth();
  const ph = page.getHeight();

  const scale = Math.min(pw / width, ph / height) * 0.92;
  const w = width * scale;
  const h = height * scale;
  const x = (pw - w) / 2;
  const y = (ph - h) / 2;

  page.drawImage(embedded, { x, y, width: w, height: h });
  const bytes = await pdf.save();

  return new NextResponse(Buffer.from(bytes), {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="qnotes-page-${pageId}.pdf"`,
      "Cache-Control": "no-store",
    },
  });
}
