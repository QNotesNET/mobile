/* eslint-disable @typescript-eslint/no-explicit-any */
// app/api/scan/recognize-page/route.ts
import { NextResponse } from "next/server";
import { connectToDB } from "@/lib/mongoose";
import Page from "@/models/PageModel";
import { Types } from "mongoose";
import { getSettings } from "@/lib/settings";
import OpenAI from "openai";
import https from "https";
import sharp from "sharp";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// —— utils ——
function toDataUrl(buf: Buffer, mime = "image/jpeg") {
  return `data:${mime};base64,${buf.toString("base64")}`;
}
function extractInt(text: string): number | null {
  // nimm die auffälligste Zahl (1–999), bevorzugt allein/„Seite X“
  const first = [...text.matchAll(/\b(?:Seite\s*)?([1-9][0-9]{0,2})\b/gi)].map(m => Number(m[1]))[0];
  if (first != null) return first;
  const any = text.match(/\b[1-9][0-9]{0,2}\b/);
  return any ? Number(any[0]) : null;
}
function normalizeModelName(name?: string) {
  // Für OpenRouter korrekten Namespace verwenden (default: openai/gpt-4o-mini)
  if (!name) return "openai/gpt-4o-mini";
  if (!name.includes("/")) return `openai/${name}`;
  return name;
}

// Cropt schmale Zonen an typischen Stellen und bereitet sie minimal vor
async function makeFastCrops(input: Buffer): Promise<string[]> {
  const base = sharp(input).rotate(); // EXIF-fix
  const meta = await base.metadata();
  const w = meta.width ?? 2000;
  const h = meta.height ?? 2800;

  // Zonen (relativ): bottom-center, bottom-left, bottom-right, top-center, top-left/right (optional)
  const zones = [
    { x: 0.30, y: 0.86, ww: 0.40, hh: 0.12 }, // bottom center
    { x: 0.00, y: 0.86, ww: 0.25, hh: 0.14 }, // bottom left
    { x: 0.75, y: 0.86, ww: 0.25, hh: 0.14 }, // bottom right
    { x: 0.35, y: 0.00, ww: 0.30, hh: 0.12 }, // top center
  ];

  const crops: Buffer[] = [];
  for (const z of zones) {
    const rx = Math.max(0, Math.floor(w * z.x));
    const ry = Math.max(0, Math.floor(h * z.y));
    const rw = Math.min(w - rx, Math.floor(w * z.ww));
    const rh = Math.min(h - ry, Math.floor(h * z.hh));
    if (rw <= 0 || rh <= 0) continue;

    const buf = await base
      .extract({ left: rx, top: ry, width: rw, height: rh })
      .resize({ width: 600 }) // klein & schnell
      .grayscale()
      .threshold(180) // binarisieren -> Ziffern treten hervor
      .jpeg({ quality: 72, mozjpeg: true })
      .toBuffer();

    crops.push(buf);
  }
  // Data-URLs zurückgeben (OpenRouter vision input_image via URL/Data-URL)
  return crops.map(b => toDataUrl(b, "image/jpeg"));
}

const keepAliveAgent = new https.Agent({ keepAlive: true, maxSockets: 50 });

export async function POST(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const notebookIdRaw = (searchParams.get("notebookId") || "").trim();
    if (!notebookIdRaw) {
      return NextResponse.json({ error: "Missing notebookId" }, { status: 400 });
    }
    if (!Types.ObjectId.isValid(notebookIdRaw)) {
      return NextResponse.json({ error: "Invalid notebookId" }, { status: 400 });
    }
    const notebookId = new Types.ObjectId(notebookIdRaw);

    // 1) Bild aus multipart
    const form = await req.formData();
    const file = form.get("image") as File | null;
    if (!file) {
      return NextResponse.json({ error: "No image file 'image' provided" }, { status: 400 });
    }
    const buf = Buffer.from(await file.arrayBuffer());

    // 2) Settings (fallback prompt in settings wird ignoriert; wir wollen NUR Zahl superschnell)
    const settings = await getSettings().catch(() => null) as any;
    const model = normalizeModelName(settings?.pageDetect?.model || "openai/gpt-4o-mini");

    // 3) Crops bauen (nur relevante Regionen → winzige Payload)
    const dataUrls = await makeFastCrops(buf);
    if (dataUrls.length === 0) {
      return NextResponse.json({ error: "Failed to crop image" }, { status: 422 });
    }

    // 4) OpenRouter Client
    const apiKey = process.env.OPENROUTER_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: "Missing OPENROUTER_API_KEY" }, { status: 500 });
    }
    const client = new OpenAI({
      apiKey,
      baseURL: "https://openrouter.ai/api/v1",
      httpAgent: keepAliveAgent,
    } as any);

    // 5) Superschneller Prompt – NUR Zahl (1–999)
    const prompt =
      "You are a page-number detector. The images are crops of the page corners/edges. " +
      "Return ONLY the page number (1-999). If you see variants like 'Seite 12', output just 12. " +
      "If uncertain, guess the most plausible. Return digits only.";

    // 6) Request: kompaktes Output, temperature 0, geringe max tokens
    //    Wir geben mehrere input_image nacheinander – Modell sucht sich die beste.
    const content: any[] = [{ type: "input_text", text: prompt }];
    for (const url of dataUrls) {
      content.push({ type: "input_image", image_url: url /* detail low implizit */ });
    }

    // kurze Deadline – wir wollen schnell sein
    const ac = new AbortController();
    const timeout = setTimeout(() => ac.abort(), 1200); // 1.2s hartes Limit

    let out = "";
    try {
      const resp = await client.responses.create({
        model,
        input: [{ role: "user", content }],
        max_output_tokens: 12,
        temperature: 0,
        // Optional schön: Provider-Header (OpenRouter empfiehlt Referer/Title)
        // extra_headers: { "HTTP-Referer": "https://app.powerbook.at", "X-Title": "Powerbook Page Detect" }
        // @ts-ignore (SDK akzeptiert das Feld)
        signal: ac.signal,
      } as any);
      out = resp.output_text || "";
    } finally {
      clearTimeout(timeout);
    }

    let pageIndex = extractInt(out);

    // Minimaler Fallback: wenn nichts kam, probier nur Bottom-Center zuerst (höchste Priorität)
    if (pageIndex == null && dataUrls[0]) {
      const content2 = [
        { type: "input_text", text: "Return ONLY the page number (1-999) as digits." },
        { type: "input_image", image_url: dataUrls[0] },
      ];
      const ac2 = new AbortController();
      const timeout2 = setTimeout(() => ac2.abort(), 900);
      try {
        const resp2 = await client.responses.create({
          model,
          input: [{ role: "user", content: content2 }],
          max_output_tokens: 8,
          temperature: 0,
          // @ts-ignore
          signal: ac2.signal,
        } as any);
        pageIndex = extractInt(resp2.output_text || "");
      } finally {
        clearTimeout(timeout2);
      }
    }

    if (pageIndex == null) {
      return NextResponse.json({ error: "Page number not detected" }, { status: 422 });
    }

    // 7) DB lookup (pageToken)
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

    return NextResponse.json({
      pageIndex,
      pageToken: page.pageToken,
      model,
      crops: dataUrls.length, // debug/info
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Server error";
    console.error("[recognize-page] error:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
