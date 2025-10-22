// app/api/openai/route.ts
import OpenAI from "openai";
import { NextResponse } from "next/server";
import { getSettings } from "@/lib/settings";

export const dynamic = "force-dynamic";

function mapResolution(detail: string | undefined): "low" | "high" {
  // OpenAI "detail" akzeptiert i.d.R. "low" | "high"
  // Wir mappen "medium" pragmatisch auf "high".
  if (!detail) return "low";
  const d = detail.toLowerCase();
  if (d === "low") return "low";
  // "medium" / "high" -> "high"
  return "high";
}

export async function POST(req: Request) {
  try {
    const { imageUrl } = (await req.json()) as { imageUrl?: string };
    if (!imageUrl) {
      return NextResponse.json({ error: "Missing imageUrl" }, { status: 400 });
    }

    // 1) Settings laden (DB)
    const settings = await getSettings();
    const visionModel = settings.vision?.model || "gpt-4o-mini";
    const visionDetail = mapResolution(settings.vision?.resolution || "low");
    const visionPrompt =
      settings.vision?.prompt?.trim() ||
      "Extract all visible text from the image. Preserve original line breaks. Return text only.";

    // 2) OpenAI-Client
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: "Missing OPENAI_API_KEY" }, { status: 500 });
    }
    const openai = new OpenAI({ apiKey });

    // 3) Anfrage an Responses-API (Vision)
    const response = await openai.responses.create({
      model: visionModel,
      input: [
        {
          role: "user",
          content: [
            { type: "input_text", text: visionPrompt },
            {
              type: "input_image",
              image_url: imageUrl,
              detail: visionDetail, // "low" | "high" (gemappt)
            },
          ],
        },
      ],
      // max_output_tokens: 2048, // optional
    });

    return NextResponse.json({
      text: response.output_text ?? "",
      user: "",
      domain: "",
      model: visionModel,
      detail: visionDetail,
    });
  } catch (err) {
    console.error("[OPENAI OCR ERROR]", err);
    return NextResponse.json({ error: "OpenAI request failed" }, { status: 500 });
  }
}
