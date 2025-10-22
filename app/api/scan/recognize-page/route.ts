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
  // nimm die auffälligste Zahl (1–999), bevorzugt „Seite X“/alleinstehend
  const m1 = [...text.matchAll(/\b(?:Seite\s*)?([1-9][0-9]{0,2})\b/gi)].map(m => Number(m[1]));
  if (m1.length) return m1[0];
  const m2 = text.match(/\b[1-9][0-9]{0,2}\b/);
  return m2 ? Number(m2[0]) : null;
}

function normalizeModelName(name?: string) {
  // Für OpenRouter Namespace erzwingen (default: openai/gpt-4o-mini)
  if (!name) return "openai/gpt-4o-mini";
  if (!name.includes("/")) return `openai/${name}`;
  return name;
}

// Sanftes Preprocessing: EXIF-rotate, moderate Resize, Graustufen (keine Schwelle!)
async function prepFullImage(input: Buffer): Promise<string> {
  const out = await sharp(input)
    .rotate()
    .resize({ width: 1600, withoutEnlargement: true })
    .grayscale()
    .jpeg({ quality: 82, mozjpeg: true })
    .toBuffer();
  return toDataUrl(out, "image/jpeg");
}

// Enger Bottom-Right-Crop (für handschriftliche blaue, kleine Ziffern)
async function makeBottomRightCrop(input: Buffer): Promise<string> {
  const base = sharp(input).rotate();
  const meta = await base.metadata();
  const W = Math.max(1, meta.width ?? 1);
  const H = Math.max(1, meta.height ?? 1);

  // sehr eckennahe Region
  let left = Math.floor(W * 0.86);
  let top = Math.floor(H * 0.90);
  let width = Math.floor(W * 0.14);
  let height = Math.floor(H * 0.10);
  if (left < 0) left = 0;
  if (top < 0) top = 0;
  if (left + width > W) width = W - left;
  if (top + height > H) height = H - top;

  const buf = await base
    .extract({ left, top, width, height })
    .resize({ width: 1200, withoutEnlargement: true }) // höher als vorher, damit fein lesbar
    .grayscale()
    .jpeg({ quality: 84, mozjpeg: true })
    .toBuffer();

  return toDataUrl(buf, "image/jpeg");
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

    // 2) Settings/Model
    const settings = (await getSettings().catch(() => null)) as any;
    const model = normalizeModelName(settings?.pageDetect?.model || "openai/gpt-4o-mini");

    // 3) OpenRouter Client
    const apiKey = process.env.OPENROUTER_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: "Missing OPENROUTER_API_KEY" }, { status: 500 });
    }
    const client = new OpenAI({
      apiKey,
      baseURL: "https://openrouter.ai/api/v1",
      httpAgent: keepAliveAgent,
      defaultHeaders: {
        "HTTP-Referer": "https://app.powerbook.at",
        "X-Title": "Powerbook Page Detect",
      },
    } as any);

    // 4) Vollbild vorbereiten & erster schneller Call (wie früher)
    const dataUrlFull = await prepFullImage(buf);
    const prompt =
      "Erkenne die auf dem Blatt gedruckte oder handschriftliche Seitennummer. " +
      "Antworte NUR mit der Zahl (z. B. 12), ohne Zusatz. " +
      "Wenn keine Zahl eindeutig sichtbar ist, antworte NICHTS.";

    const messagesFull: any = [
      {
        role: "user",
        content: [
          { type: "text", text: prompt },
          { type: "image_url", image_url: { url: dataUrlFull, detail: "high" } },
        ],
      },
    ];

    // harte, kurze Deadline
    const ac1 = new AbortController();
    const t1 = setTimeout(() => ac1.abort(), 1500);

    let raw = "";
    try {
      const resp = await client.chat.completions.create({
        model,
        messages: messagesFull,
        temperature: 0,
        max_tokens: 12,
        // @ts-expect-error OpenAI SDK erlaubt signal durchgereicht
        signal: ac1.signal,
      });
      raw = resp.choices?.[0]?.message?.content ?? "";
    } finally {
      clearTimeout(t1);
    }

    let pageIndex = extractInt(raw);

    // 5) Fallback: enger Bottom-Right-Crop, erneut fragen (wie früherer „zweiter Versuch“)
    if (pageIndex == null) {
      const br = await makeBottomRightCrop(buf);
      const fbPrompt =
        "Erkenne NUR die Seitennummer in der unteren rechten Ecke. " +
        "Antworte ausschließlich mit Ziffern (1–999). Keine Wörter, kein Zeilenumbruch.";

      const messagesBR: any = [
        {
          role: "user",
          content: [
            { type: "text", text: fbPrompt },
            { type: "image_url", image_url: { url: br, detail: "high" } },
          ],
        },
      ];

      const ac2 = new AbortController();
      const t2 = setTimeout(() => ac2.abort(), 1200);

      try {
        const resp2 = await client.chat.completions.create({
          model,
          messages: messagesBR,
          temperature: 0,
          max_tokens: 10,
          // @ts-expect-error OpenAI SDK erlaubt signal durchgereicht
          signal: ac2.signal,
        });
        const raw2 = resp2.choices?.[0]?.message?.content ?? "";
        pageIndex = extractInt(raw2);
      } finally {
        clearTimeout(t2);
      }
    }

    if (pageIndex == null) {
      return NextResponse.json({ error: "Page number not detected" }, { status: 422 });
    }

    // 6) DB lookup (pageToken)
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

    // 7) Antwort
    return NextResponse.json({
      pageIndex,
      pageToken: page.pageToken,
      model,
      detail: "high",
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Server error";
    console.error("[recognize-page] error:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
