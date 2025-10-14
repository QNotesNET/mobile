import OpenAI from "openai";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const { imageUrl } = (await req.json()) as { imageUrl?: string };
    if (!imageUrl) {
      return NextResponse.json({ error: "Missing imageUrl" }, { status: 400 });
    }

    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

    const response = await openai.responses.create({
      model: "gpt-5", // dein Modell
      input: [
        {
          role: "user",
          content: [
            {
              type: "input_text",
              text:
                "Give me the text provided based on this image. " +
                "Can be German or English – write the response in the language which was provided originally. " +
                "Return only the extracted text (preserve line breaks).",
            },
            {
              type: "input_image",
              image_url: imageUrl,
              detail: "auto"
            },
          ],
        },
      ],
      // optional, je nach Länge
      // max_output_tokens: 2048,
    });

    return NextResponse.json({ text: response.output_text ?? "" });
  } catch (err) {
    console.error("[OPENAI OCR ERROR]", err);
    return NextResponse.json(
      { error: err ?? "OpenAI request failed" },
      { status: 500 }
    );
  }
}
