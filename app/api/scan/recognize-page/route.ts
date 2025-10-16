// app/api/scan/recognize-page/route.ts
import { NextResponse } from "next/server";
import { connectToDB } from "@/lib/mongoose";
import Page from "@/models/PageModel";
import OpenAI from "openai";
import { Types } from "mongoose";
import { getSettings } from "@/lib/settings";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// ——— helpers ———
function toDataUrl(buf: Buffer, mime: string) {
  return `data:${mime};base64,${buf.toString("base64")}`;
}
function extractInt(text: string): number | null {
  // nimm die auffälligste Zahl (1–999), bevorzugt „Seite X“/alleinstehend
  const candidates = [...text.matchAll(/\b(?:Seite\s*)?([1-9][0-9]{0,2})\b/gi)].map(m => Number(m[1]));
  if (candidates.length) return candidates[0];
  const anyDigits = text.match(/[0-9]{1,3}/);
  return anyDigits ? Number(anyDigits[0]) : null;
}
function mapResolution(detail?: string): "low" | "high" {
  if (!detail) return "low";
  const d = detail.toLowerCase();
  if (d === "low") return "low";
  return "high"; // „medium“/„high“ => high
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

    // 1) Bild aus multipart ziehen
    const form = await req.formData();
    const file = form.get("image") as File | null;
    if (!file) {
      return NextResponse.json({ error: "No image file 'image' provided" }, { status: 400 });
    }
    const mime = file.type || "image/jpeg";
    const buf = Buffer.from(await file.arrayBuffer());

    // OPTIONAL: hier könntest du später ein leichtes Cropping/Downscaling einbauen
    // (z.B. mit 'sharp'). Ganz wichtig: Immer fallback auf das Original.
    // const processed = await maybeCropOrDownscale(buf).catch(() => buf);

    const dataUrl = toDataUrl(buf, mime);

    // 2) Settings laden (pageDetect: model/resolution/prompt)
    const settings = await getSettings();
    const model = settings.pageDetect?.model || "gpt-4o-mini";
    const detail = mapResolution(settings.pageDetect?.resolution || "low");
    const prompt =
      settings.pageDetect?.prompt?.trim() ||
      "Erkenne die auf dem Blatt gedruckte Seitennummer. Antworte NUR mit der Zahl (z. B. 12), ohne Zusatz.";

    // 3) OpenAI: Seitennummer erkennen
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: "Missing OPENAI_API_KEY" }, { status: 500 });
    }
    const openai = new OpenAI({ apiKey });

    // Erster Versuch
    const resp1 = await openai.responses.create({
      model,
      input: [
        {
          role: "user",
          content: [
            { type: "input_text", text: prompt },
            { type: "input_image", image_url: dataUrl, detail },
          ],
        },
      ],
      // max_output_tokens: 32,
      // temperature: 0,
    });

    let rawText = resp1.output_text || "";
    let pageIndex = extractInt(rawText);

    // Fallback: zweiter Versuch mit Fokus-Hinweis (ohne Bild zu verändern)
    if (pageIndex == null) {
      const fallbackPrompt =
        `${prompt}\n` +
        "Falls unklar: Prüfe explizit die Ecken (oben/unten links/rechts). Antworte NUR mit der Zahl.";
      const resp2 = await openai.responses.create({
        model,
        input: [
          {
            role: "user",
            content: [
              { type: "input_text", text: fallbackPrompt },
              { type: "input_image", image_url: dataUrl, detail },
            ],
          },
        ],
        // max_output_tokens: 32,
        // temperature: 0,
      });
      rawText = resp2.output_text || rawText;
      pageIndex = extractInt(rawText);
    }

    if (pageIndex == null) {
      return NextResponse.json({ error: "Page number not detected" }, { status: 422 });
    }

    // 4) DB: pageToken zu (notebookId, pageIndex) finden
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

    // 5) Antwort
    return NextResponse.json({
      pageIndex,
      pageToken: page.pageToken,
      model,
      detail,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Server error";
    console.error("[recognize-page] error:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
