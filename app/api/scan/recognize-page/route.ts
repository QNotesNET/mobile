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

// ——— utils ———
function toDataUrl(buf: Buffer, mime = "image/jpeg") {
  return `data:${mime};base64,${buf.toString("base64")}`;
}
function normalizeModelName(name?: string) {
  if (!name) return "openai/gpt-4o-mini";
  if (!name.includes("/")) return `openai/${name}`;
  return name;
}

const keepAliveAgent = new https.Agent({ keepAlive: true, maxSockets: 50 });

// Sehr enge Ecken-Crops + mehrere Varianten speziell für blaue, kleine Ziffern
type Corner = "br" | "bc" | "bl" | "tc";
type Variant =
  | "soft900" | "soft1200"
  | "hard150_900" | "hard130_900"
  | "lab_b_900" | "lab_b_1200";

type CropOut = { url: string; corner: Corner; variant: Variant };

async function makeCropsForBottomRight(base: sharp.Sharp, W: number, H: number): Promise<CropOut[]> {
  // sehr eckennahe Region
  const z = { x: 0.86, y: 0.90, ww: 0.14, hh: 0.10 }; // noch näher an die Ecke
  let left = Math.floor(W * z.x);
  let top = Math.floor(H * z.y);
  let width = Math.floor(W * z.ww);
  let height = Math.floor(H * z.hh);
  if (left < 0) left = 0;
  if (top < 0) top = 0;
  if (left + width > W) width = W - left;
  if (top + height > H) height = H - top;
  if (width < 12 || height < 12) return [];

  const out: CropOut[] = [];

  // Helper für verschiedene Renderings
  async function pushSoft(resW: number, v: Variant) {
    const b = await base.extract({ left, top, width, height })
      .resize({ width: resW })
      .grayscale()
      .jpeg({ quality: 80, mozjpeg: true })
      .toBuffer();
    out.push({ url: toDataUrl(b, "image/jpeg"), corner: "br", variant: v });
  }
  async function pushHard(th: number, v: Variant) {
    const b = await base.extract({ left, top, width, height })
      .resize({ width: 900 })
      .grayscale()
      .threshold(th)
      .jpeg({ quality: 74, mozjpeg: true })
      .toBuffer();
    out.push({ url: toDataUrl(b, "image/jpeg"), corner: "br", variant: v });
  }
  async function pushLabB(resW: number, v: Variant) {
    // In LAB konvertieren → b-Channel hebt Blau/Gelb-Kontrast
    const lab = await base.extract({ left, top, width, height })
      .resize({ width: resW })
      .toColourspace("lab")
      .extractChannel(2)            // 'b' channel
      .linear(1, 0)                 // identity (Platzhalter falls justieren nötig)
      .threshold(140)               // leicht, um Ziffer hervorzuheben
      .jpeg({ quality: 78, mozjpeg: true })
      .toBuffer();
    out.push({ url: toDataUrl(lab, "image/jpeg"), corner: "br", variant: v });
  }

  try { await pushSoft(900, "soft900"); } catch {}
  try { await pushSoft(1200, "soft1200"); } catch {}
  try { await pushHard(150, "hard150_900"); } catch {}
  try { await pushHard(130, "hard130_900"); } catch {}
  try { await pushLabB(900, "lab_b_900"); } catch {}
  try { await pushLabB(1200, "lab_b_1200"); } catch {}

  return out;
}

async function makeCropsGeneric(base: sharp.Sharp, W: number, H: number): Promise<CropOut[]> {
  // Backup-Zonen (nicht so eng)
  const zones: { id: Corner; x: number; y: number; ww: number; hh: number }[] = [
    { id: "bc", x: 0.35, y: 0.88, ww: 0.30, hh: 0.12 },
    { id: "bl", x: 0.00, y: 0.88, ww: 0.16, hh: 0.12 },
    { id: "tc", x: 0.35, y: 0.00, ww: 0.30, hh: 0.12 },
  ];
  const out: CropOut[] = [];

  for (const z of zones) {
    let left = Math.floor(W * z.x);
    let top = Math.floor(H * z.y);
    let width = Math.floor(W * z.ww);
    let height = Math.floor(H * z.hh);
    if (left < 0) left = 0;
    if (top < 0) top = 0;
    if (left + width > W) width = W - left;
    if (top + height > H) height = H - top;
    if (width < 12 || height < 12) continue;

    try {
      const soft = await base.extract({ left, top, width, height })
        .resize({ width: 900 })
        .grayscale()
        .jpeg({ quality: 80, mozjpeg: true })
        .toBuffer();
      out.push({ url: toDataUrl(soft, "image/jpeg"), corner: z.id, variant: "soft900" });
    } catch {}
  }
  return out;
}

async function makeFastCrops(input: Buffer): Promise<CropOut[]> {
  const base = sharp(input).rotate(); // EXIF fix
  const meta = await base.metadata();
  const W = Math.max(1, meta.width ?? 1);
  const H = Math.max(1, meta.height ?? 1);

  const br = await makeCropsForBottomRight(base, W, H);
  const backups = await makeCropsGeneric(base, W, H);

  // Reihenfolge: alle br-Varianten zuerst (soft1200, soft900, lab, hard…), dann backups
  const prefer: Variant[] = ["soft1200", "soft900", "lab_b_1200", "lab_b_900", "hard130_900", "hard150_900"];
  br.sort((a, b) => prefer.indexOf(a.variant) - prefer.indexOf(b.variant));
  return [...br, ...backups];
}

// JSON-only Erkennung für einen Crop
async function detectFromCrop(
  client: OpenAI,
  model: string,
  cropUrl: string,
  detail: "low" | "high",
  timeoutMs = 850
): Promise<number | null> {
  const messages: any = [{
    role: "user",
    content: [
      { type: "text", text:
        "Look ONLY at this crop near a page corner.\n" +
        "If you clearly SEE a printed/handwritten PAGE NUMBER (1-999), return JSON exactly as {\"n\": <digits>}.\n" +
        "If no page number is visible, return {\"n\": null}.\n" +
        "Do NOT guess. Digits only. No extra keys." },
      { type: "image_url", image_url: { url: cropUrl, detail } },
    ],
  }];

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
    const crops = await makeFastCrops(buf);
    if (!crops.length) {
      return NextResponse.json({ error: "Crop failed" }, { status: 422 });
    }

    // OpenRouter client
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

    // PASS 1 — schnell: low detail auf allen Crops (br zuerst)
    const first = await Promise.all(
      crops.map((c, i) => detectFromCrop(client, model, c.url, "low", i < 3 ? 950 : 800))
    );

    // Voting
    const counts = new Map<number, number>();
    first.forEach(n => { if (typeof n === "number") counts.set(n, (counts.get(n) ?? 0) + 1); });

    let decided: number | null = null;
    for (const [n, c] of counts.entries()) if (c >= 2) { decided = n; break; }

    // Preferiere erstes br-Ergebnis
    if (decided == null) {
      const brIdx = crops.findIndex(c => c.corner === "br");
      if (brIdx >= 0 && typeof first[brIdx] === "number") decided = first[brIdx]!;
    }

    // Single unique Treffer
    if (decided == null) {
      const only = [...counts.entries()].filter(([, c]) => c >= 1);
      if (only.length === 1) decided = only[0][0];
    }

    // PASS 2 — gezielte High-Detail-Retries nur für br-Varianten
    if (decided == null) {
      for (const pref of ["soft1200", "lab_b_1200", "soft900", "lab_b_900", "hard130_900", "hard150_900"] as Variant[]) {
        const c = crops.find(x => x.corner === "br" && x.variant === pref);
        if (!c) continue;
        const n = await detectFromCrop(client, model, c.url, "high", 1100);
        if (typeof n === "number") { decided = n; break; }
      }
    }

    // PASS 3 — letzter Versuch: bottom-center soft high
    if (decided == null) {
      const bc = crops.find(x => x.corner === "bc");
      if (bc) decided = await detectFromCrop(client, model, bc.url, "high", 1000);
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
      cropsTried: crops.length,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Server error";
    console.error("[recognize-page] error:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
