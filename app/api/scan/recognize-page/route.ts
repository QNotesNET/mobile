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
  const first = [...text.matchAll(/\b(?:Seite\s*)?([1-9][0-9]{0,2})\b/gi)].map(
    (m) => Number(m[1])
  )[0];
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
  const base = sharp(input).rotate(); // EXIF fix
  const meta = await base.metadata();
  const W = Math.max(1, meta.width ?? 1);
  const H = Math.max(1, meta.height ?? 1);

  // typische Zonen (relativ)
  const zones = [
    { x: 0.3, y: 0.86, ww: 0.4, hh: 0.12 },  // bottom center
    { x: 0.0, y: 0.86, ww: 0.25, hh: 0.14 }, // bottom left
    { x: 0.75, y: 0.86, ww: 0.25, hh: 0.14 },// bottom right
    { x: 0.35, y: 0.00, ww: 0.3, hh: 0.12 }, // top center
  ];

  const dataUrls: string[] = [];
  const MIN_PX = 8; // minimale Kantenlänge nach dem Clamp

  for (const z of zones) {
    // gewünschte Region
    let left = Math.floor(W * z.x);
    let top = Math.floor(H * z.y);
    let width = Math.floor(W * z.ww);
    let height = Math.floor(H * z.hh);

    // clamp innerhalb des Bildes
    if (left < 0) left = 0;
    if (top < 0) top = 0;
    if (width < MIN_PX) width = MIN_PX;
    if (height < MIN_PX) height = MIN_PX;

    if (left + width > W) width = W - left;
    if (top + height > H) height = H - top;

    // Falls nach Clamp etwas schief ist, skippen
    if (width < MIN_PX || height < MIN_PX) continue;

    try {
      const buf = await base
        .extract({ left, top, width, height })
        .resize({ width: 600 }) // klein & schnell
        .grayscale()
        .threshold(180) // Ziffern hervorheben
        .jpeg({ quality: 72, mozjpeg: true })
        .toBuffer();

      dataUrls.push(toDataUrl(buf, "image/jpeg"));
    } catch {
      // einzelner Crop fehlgeschlagen → überspringen
      continue;
    }
  }

  // Fallback: kein gültiger Crop → 1 kleines Vollbild (sehr schnell)
  if (dataUrls.length === 0) {
    const tiny = await base
      .resize({ width: 900 }) // klein halten
      .grayscale()
      .threshold(180)
      .jpeg({ quality: 72, mozjpeg: true })
      .toBuffer();
    dataUrls.push(toDataUrl(tiny, "image/jpeg"));
  }

  return dataUrls;
}

const keepAliveAgent = new https.Agent({ keepAlive: true, maxSockets: 50 });

// Build Chat-Vision messages für OpenRouter
function buildMessages(prompt: string, dataUrls: string[], detail: "low" | "high" | "auto" = "low") {
  const content: any[] = [{ type: "text", text: prompt }];
  for (const u of dataUrls) {
    content.push({
      type: "image_url",
      image_url: { url: u, detail },
    });
  }
  return [{ role: "user", content }] as any;
}

export async function POST(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const notebookIdRaw = (searchParams.get("notebookId") || "").trim();
    if (!notebookIdRaw) {
      return NextResponse.json(
        { error: "Missing notebookId" },
        { status: 400 }
      );
    }
    if (!Types.ObjectId.isValid(notebookIdRaw)) {
      return NextResponse.json(
        { error: "Invalid notebookId" },
        { status: 400 }
      );
    }
    const notebookId = new Types.ObjectId(notebookIdRaw);

    // 1) Bild aus multipart
    const form = await req.formData();
    const file = form.get("image") as File | null;
    if (!file) {
      return NextResponse.json(
        { error: "No image file 'image' provided" },
        { status: 400 }
      );
    }
    const buf = Buffer.from(await file.arrayBuffer());

    // 2) Settings (wir zielen auf nur die Zahl → eigener Prompt, unabhängig vom Fallback-Setting)
    const settings = (await getSettings().catch(() => null)) as any;
    const model = normalizeModelName(
      settings?.pageDetect?.model || "openai/gpt-4o-mini"
    );

    // 3) Crops bauen (nur relevante Regionen → winzige Payload)
    const dataUrls = await makeFastCrops(buf);
    if (dataUrls.length === 0) {
      return NextResponse.json(
        { error: "Failed to crop image" },
        { status: 422 }
      );
    }

    // 4) OpenRouter Client
    const apiKey = process.env.OPENROUTER_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: "Missing OPENROUTER_API_KEY" },
        { status: 500 }
      );
    }
    const client = new OpenAI({
      apiKey,
      baseURL: "https://openrouter.ai/api/v1",
      httpAgent: keepAliveAgent,
      // optional, aber von OpenRouter empfohlen:
      defaultHeaders: {
        "HTTP-Referer": "https://app.powerbook.at",
        "X-Title": "Powerbook Page Detect",
      },
    } as any);

    // 5) Superschneller Prompt – NUR Zahl (1–999)
    const prompt =
      "You are a page-number detector. The images are crops of the page corners/edges. " +
      "Return ONLY the page number (1-999). If you see variants like 'Seite 12', output just 12. " +
      "If uncertain, guess the most plausible. Return digits only.";

    // 6) Erster Call (kurze Deadline)
    const messages = buildMessages(prompt, dataUrls, "low");

    const ac = new AbortController();
    const timeout = setTimeout(() => ac.abort(), 1200); // 1.2s hartes Limit

    let out = "";
    try {
      const resp = await client.chat.completions.create({
        model,
        messages,
        temperature: 0,
        max_tokens: 12,
        // @ts-expect-error ---
        signal: ac.signal,
      });
      out = resp.choices?.[0]?.message?.content ?? "";
    } finally {
      clearTimeout(timeout);
    }

    let pageIndex = extractInt(out);

    // Minimaler Fallback: wenn nichts kam, probiere nur Bottom-Center zuerst (höchste Priorität)
    if (pageIndex == null && dataUrls[0]) {
      const messages2 = buildMessages(
        "Return ONLY the page number (1-999) as digits.",
        [dataUrls[0]],
        "low"
      );
      const ac2 = new AbortController();
      const timeout2 = setTimeout(() => ac2.abort(), 900);
      try {
        const resp2 = await client.chat.completions.create({
          model,
          messages: messages2,
          temperature: 0,
          max_tokens: 8,
          // @ts-expect-error ---
          signal: ac2.signal,
        });
        out = resp2.choices?.[0]?.message?.content ?? out;
        pageIndex = extractInt(out);
      } finally {
        clearTimeout(timeout2);
      }
    }

    if (pageIndex == null) {
      return NextResponse.json(
        { error: "Page number not detected" },
        { status: 422 }
      );
    }

    // 7) DB lookup (pageToken)
    await connectToDB();
    const page = await Page.findOne({ notebookId, pageIndex })
      .select({ pageToken: 1 })
      .lean<{ pageToken: string } | null>();

    if (!page) {
      return NextResponse.json(
        {
          error: `No page for notebookId=${notebookIdRaw} and pageIndex=${pageIndex}`,
        },
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
