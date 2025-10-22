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
function normalizeModelName(name?: string) {
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

  // Reihenfolge ist wichtig: index 0 = bottom center (höchste Priorität)
  const zones = [
    { x: 0.30, y: 0.86, ww: 0.40, hh: 0.12 }, // [0] bottom center
    { x: 0.00, y: 0.86, ww: 0.25, hh: 0.14 }, // [1] bottom left
    { x: 0.75, y: 0.86, ww: 0.25, hh: 0.14 }, // [2] bottom right
    { x: 0.35, y: 0.00, ww: 0.30, hh: 0.12 }, // [3] top center
  ];

  const dataUrls: string[] = [];
  const MIN_PX = 8;

  for (const z of zones) {
    let left = Math.floor(W * z.x);
    let top = Math.floor(H * z.y);
    let width = Math.floor(W * z.ww);
    let height = Math.floor(H * z.hh);

    if (left < 0) left = 0;
    if (top < 0) top = 0;
    if (width < MIN_PX) width = MIN_PX;
    if (height < MIN_PX) height = MIN_PX;

    if (left + width > W) width = W - left;
    if (top + height > H) height = H - top;

    if (width < MIN_PX || height < MIN_PX) continue;

    try {
      const buf = await base
        .extract({ left, top, width, height })
        .resize({ width: 600 })
        .grayscale()
        .threshold(180)
        .jpeg({ quality: 72, mozjpeg: true })
        .toBuffer();

      dataUrls.push(toDataUrl(buf, "image/jpeg"));
    } catch {
      continue;
    }
  }

  if (dataUrls.length === 0) {
    const tiny = await base
      .resize({ width: 900 })
      .grayscale()
      .threshold(180)
      .jpeg({ quality: 72, mozjpeg: true })
      .toBuffer();
    dataUrls.push(toDataUrl(tiny, "image/jpeg"));
  }

  return dataUrls;
}

const keepAliveAgent = new https.Agent({ keepAlive: true, maxSockets: 50 });

// Ein Crop -> JSON-only Abfrage: {"n": 12} oder {"n": null}
async function detectFromCrop(
  client: OpenAI,
  model: string,
  cropUrl: string,
  timeoutMs = 800
): Promise<number | null> {
  const messages: any = [
    {
      role: "user",
      content: [
        {
          type: "text",
          text:
            "Look ONLY at this single crop of a page margin.\n" +
            "If you clearly SEE a page number (1-999), return JSON exactly as {\"n\": <digits>}.\n" +
            "If no page number is visible, return {\"n\": null}.\n" +
            "Do NOT guess. Digits only. No other fields.",
        },
        {
          type: "image_url",
          image_url: { url: cropUrl, detail: "low" },
        },
      ],
    },
  ];

  const ac = new AbortController();
  const to = setTimeout(() => ac.abort(), timeoutMs);

  try {
    const resp = await client.chat.completions.create({
      model,
      messages,
      temperature: 0,
      max_tokens: 20,
      response_format: { type: "json_object" },
      // @ts-expect-error ---
      signal: ac.signal,
    });
    const txt = resp.choices?.[0]?.message?.content ?? "{}";
    const parsed = JSON.parse(txt);
    const n = parsed?.n;
    if (typeof n === "number" && Number.isFinite(n) && n >= 1 && n <= 999) {
      return Math.trunc(n);
    }
    if (n === null) return null;
    // Fallback-Parser, falls response_format ignoriert wurde:
    const m = String(txt).match(/\b([1-9][0-9]{0,2})\b/);
    return m ? Number(m[1]) : null;
  } catch {
    return null;
  } finally {
    clearTimeout(to);
  }
}

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

    // Bild
    const form = await req.formData();
    const file = form.get("image") as File | null;
    if (!file) {
      return NextResponse.json({ error: "No image file 'image' provided" }, { status: 400 });
    }
    const buf = Buffer.from(await file.arrayBuffer());

    // Settings/Model
    const settings = (await getSettings().catch(() => null)) as any;
    const model = normalizeModelName(settings?.pageDetect?.model || "openai/gpt-4o-mini");

    // Crops
    const dataUrls = await makeFastCrops(buf);

    // OpenRouter
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

    // Parallel pro Crop (sehr schnell, keine Rates)
    // Priorität: index 0 (bottom center) > übrige
    const perCrop = await Promise.all(
      dataUrls.map((u, i) => detectFromCrop(client, model, u, i === 0 ? 900 : 800))
    );

    // Mehrheitsentscheid: gleiche Zahl in >=2 Crops
    const counts = new Map<number, number>();
    for (const n of perCrop) {
      if (typeof n === "number") {
        counts.set(n, (counts.get(n) ?? 0) + 1);
      }
    }
    let decided: number | null = null;
    for (const [n, c] of counts.entries()) {
      if (c >= 2) {
        decided = n; break;
      }
    }
    // sonst: nimm bottom-center, wenn dort was erkannt wurde
    if (decided == null && typeof perCrop[0] === "number") {
      decided = perCrop[0] as number;
    }
    // sonst: wenn genau EINE Zahl overall erkannt wurde, nimm diese
    if (decided == null) {
      const only = [...counts.entries()].filter(([, c]) => c >= 1);
      if (only.length === 1) decided = only[0][0];
    }

    if (decided == null) {
      return NextResponse.json({ error: "Page number not detected" }, { status: 422 });
    }

    const pageIndex = decided;

    // DB lookup (pageToken)
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
      crops: dataUrls.length,
      votes: Object.fromEntries([...counts.entries()]), // debug
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Server error";
    console.error("[recognize-page] error:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
