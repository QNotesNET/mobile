// app/api/scan/recognize-page/route.ts
import { NextResponse } from "next/server";
import { connectToDB } from "@/lib/mongoose";
import Page from "@/models/PageModel";
import OpenAI from "openai";
import { Types } from "mongoose";

export const runtime = "nodejs";

// kleine Hilfen
function toDataUrl(buf: Buffer, mime: string) {
  return `data:${mime};base64,${buf.toString("base64")}`;
}
function extractInt(text: string): number | null {
  // nimm die auffälligste Zahl (1–999), bevorzugt einzeln/umkringelt/„Seite X“
  const candidates = [...text.matchAll(/\b(?:Seite\s*)?([1-9][0-9]{0,2})\b/gi)].map(m => Number(m[1]));
  if (candidates.length) return candidates[0];
  const anyDigits = text.match(/[0-9]{1,3}/);
  return anyDigits ? Number(anyDigits[0]) : null;
}

export async function POST(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const notebookIdRaw = (searchParams.get("notebookId") || "").trim();
    if (!notebookIdRaw) {
      return NextResponse.json({ error: "Missing notebookId" }, { status: 400 });
    }
    const notebookId = new Types.ObjectId(notebookIdRaw); // validiert gleich mit

    // 1) Bild aus multipart ziehen
    const form = await req.formData();
    const file = form.get("image") as File | null;
    if (!file) {
      return NextResponse.json({ error: "No image file 'image' provided" }, { status: 400 });
    }
    const mime = file.type || "image/jpeg";
    const buf = Buffer.from(await file.arrayBuffer());
    const dataUrl = toDataUrl(buf, mime);

    // 2) OpenAI: Seitennummer erkennen
    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    const prompt =
      "Lies nur die gedruckte Seitennummer dieses Blattes (unten oder oben links/rechts). " +
      "Antworte ausschließlich mit der Zahl (z.B. 12) ohne sonstigen Text.";

    const resp = await openai.responses.create({
      model: "gpt-5",
      input: [
        {
          role: "user",
          content: [
            { type: "input_text", text: prompt },
            { type: "input_image", image_url: dataUrl, detail: "auto" },
          ],
        },
      ],
      // max_output_tokens: 16,
      temperature: 0,
    });

    const rawText = (resp as any).output_text as string || "";
    const pageIndex = extractInt(rawText ?? "");
    if (pageIndex == null) {
      return NextResponse.json({ error: "Page number not detected" }, { status: 422 });
    }

    // 3) DB: pageToken zu (notebookId, pageIndex) finden
    await connectToDB();
    const page = await Page.findOne({ notebookId, pageIndex })
      .select({ pageToken: 1 })
      .lean<{ pageToken: string } | null>();

    if (!page) {
      return NextResponse.json(
        { error: `No page for notebookId=${notebookIdRaw} and pageIndex=${pageIndex}` },
        { status: 404 }
      );
    }

    // 4) Antwort
    return NextResponse.json({
      pageIndex,
      pageToken: page.pageToken,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Server error";
    console.error("[recognize-page] error:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
