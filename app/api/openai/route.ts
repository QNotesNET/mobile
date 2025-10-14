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
                "The user can also write keywords like 'CAL', 'TODO', 'WA' - ONLY if they are surrounded by a circle. Return it with the same writing " +
                "so e.g. CAL MUST always be big. Everytime you extracted a keyword put a '--kw' in front of it. " +
                "Also check, if the content is not in one line (for example, a date is written above a time) but is within the same circle, it counts as one Keyword" +
                " not as two different ones. This applies to all keywords. Don't care if it is written in one line, two or more. If it is within ONE circle, it counts as one Keyword." + 
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

    return NextResponse.json({ text: response.output_text ?? "", user: "WolfgangP", domain: "nexoro.net" });
  } catch (err) {
    console.error("[OPENAI OCR ERROR]", err);
    return NextResponse.json(
      { error: err ?? "OpenAI request failed" },
      { status: 500 }
    );
  }
}
