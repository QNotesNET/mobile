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
  // Für OpenRouter korrekten Namespace verwenden (default: openai/gpt-4o-mini)
  if (!name) return "openai/gpt-4o-mini";
  if (!name.includes("/")) return `openai/${name}`;
  return name;
}

const keepAliveAgent = new https.Agent({ keepAlive: true, maxSockets: 50 });

/**
 * Cropt sehr eckennahe Zonen und liefert pro Zone zwei Varianten:
 *  - hard: binarisiert (threshold), gut bei dunkler Tinte
 *  - soft: nur grayscale, erhält helle/blaue Tinte
 * Zudem höhere Crop-Auflösung (width 900) für kleine Ziffern.
 */
async function makeFastCrops(input: Buffer): Promise<{ url: string; kind: "hard" | "soft"; corner: "br" | "bc" | "bl" | "tc" }[]> {
  const base = sharp(input).rotate(); // EXIF fix
  const meta = await base.metadata();
  const W = Math.max(1, meta.width ?? 1);
  const H = Math.max(1, meta.height ?? 1);

  // Sehr eckennahe/untere Zonen (Priorität: br > bc > bl > tc)
  const zones = [
    { id: "br", x: 0.84, y: 0.88, ww: 0.16, hh: 0.12 }, // bottom-right
    { id: "bc", x: 0.35, y: 0.88, ww: 0.30, hh: 0.12 }, // bottom-center
    { id: "bl", x: 0.00, y: 0.88, ww: 0.16, hh: 0.12 }, // bottom-left
    { id: "tc", x: 0.35, y: 0.00, ww: 0.30, hh: 0.12 }, // top-center
  ] as const;

  const out: { url: string; kind: "hard" | "soft"; corner: "br" | "bc" | "bl" | "tc" }[] = [];
  const MIN_PX = 12;

  for (const z of zones) {
    let left = Math.floor(W * z.x);
    let top = Math.floor(H * z.y);
    let width = Math.floor(W * z.ww);
    let height = Math.floor(H * z.hh);

    if (left < 0) left = 0;
    if (top < 0) top = 0;
    if (left + width > W) width = W - left;
    if (top + height > H) height = H - top;
    if (width < MIN_PX || height < MIN_PX) continue;

    // Variante A: hard (binarisiert)
    try {
      const hard = await base
        .extract({ left, top, width, height })
        .resize({ width: 900 })
        .grayscale()
        .threshold(150) // etwas sanfter als 180 → blaue Tinte bleibt eher sichtbar
        .jpeg({ quality: 74, mozjpeg: true })
        .toBuffer();
      out.push({ url: toDataUrl(hard, "image/jpeg"), kind: "hard", corner: z.id });
    } catch {}

    // Variante B: soft (nur grayscale)
    try {
      const soft = await base
        .extract({ left, top, width, height })
        .resize({ width: 900 })
        .grayscale()
        .jpeg({ quality: 78, mozjpeg: true })
        .toBuffer();
      out.push({ url: toDataUrl(soft, "image/jpeg"), kind: "soft", corner: z.id });
    } catch {}
  }

  // Fallback: kleines Vollbild (soft)
  if (out.length === 0) {
    const tiny = await base
      .resize({ width: 1100 })
      .grayscale()
      .jpeg({ quality: 78, mozjpeg: true })
      .toBuffer();
    out.push({ url: toDataUrl(tiny, "image/jpeg"), kind: "soft", corner: "bc" });
  }

  // Sortierung nach Ecke (Priorität) und soft vor hard (für blaue Stifte)
  const orderCorner: Record<string, number> = { br: 0, bc: 1, bl: 2, tc: 3 };
  const orderKind: Record<string, number> = { soft: 0, hard: 1 };
  out.sort((a, b) => {
    const oc = orderCorner[a.corner] - orderCorner[b.corner];
    return oc !== 0 ? oc : orderKind[a.kind] - orderKind[b.kind];
  });

  return out;
}

/** Ein einzelner Crop -> JSON-only Abfrage { "n": <digits> } | { "n": null } */
async function detectFromCrop(
  client: OpenAI,
  model: string,
  cropUrl: string,
  detail: "low" | "high",
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
        { type: "image_url", image_url: { url: cropUrl, detail } },
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
    let n: unknown = null;
    try {
      const parsed = JSON.parse(txt);
      n = parsed?.n;
    } catch {
      // falls response_format ignoriert wurde: Regex-Fallback
      const m = String(txt).match(/\b([1-9][0-9]{0,2})\b/);
      if (m) n = Number(m[1]);
    }
    if (typeof n === "number" && Number.isFinite(n) && n >= 1 && n <= 999) {
      return Math.trunc(n);
    }
    return null;
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

    // 3) Crops generieren
    const crops = await makeFastCrops(buf);

    // 4) OpenRouter Client
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

    // 5) Erkennung – Pass 1 (schnell): detail:"low" für alle Crops
    const firstPass = await Promise.all(
      crops.map((c, i) => detectFromCrop(client, model, c.url, "low", c.corner === "br" ? 900 : 800))
    );

    // Voting / Priorität
    const counts = new Map<number, number>();
    for (const n of firstPass) if (typeof n === "number") counts.set(n, (counts.get(n) ?? 0) + 1);

    let decided: number | null = null;
    // Mehrheit (>=2 gleiche Treffer)
    for (const [n, c] of counts.entries()) if (c >= 2) { decided = n; break; }

    // Bottom-right Priorität
    if (decided == null) {
      const brIdx = crops.findIndex((c) => c.corner === "br");
      if (brIdx >= 0 && typeof firstPass[brIdx] === "number") decided = firstPass[brIdx]!;
    }

    // Single unique
    if (decided == null) {
      const only = [...counts.entries()].filter(([, c]) => c >= 1);
      if (only.length === 1) decided = only[0][0];
    }

    // 6) Falls noch nix: gezielte Retries mit detail:"high" (nur relevante Crops)
    if (decided == null) {
      const brSoft = crops.find((c) => c.corner === "br" && c.kind === "soft");
      if (brSoft) decided = await detectFromCrop(client, model, brSoft.url, "high", 1000);
    }
    if (decided == null) {
      const brHard = crops.find((c) => c.corner === "br" && c.kind === "hard");
      if (brHard) decided = await detectFromCrop(client, model, brHard.url, "high", 1000);
    }
    if (decided == null) {
      const bcSoft = crops.find((c) => c.corner === "bc" && c.kind === "soft");
      if (bcSoft) decided = await detectFromCrop(client, model, bcSoft.url, "high", 900);
    }

    if (decided == null) {
      return NextResponse.json({ error: "Page number not detected" }, { status: 422 });
    }
    const pageIndex = decided;

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

    // 8) Antwort
    return NextResponse.json({
      pageIndex,
      pageToken: page.pageToken,
      model,
      crops: crops.length,
      // optional debug:
      // firstPass,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Server error";
    console.error("[recognize-page] error:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
