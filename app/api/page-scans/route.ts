/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextResponse } from "next/server";
import { connectToDB } from "@/lib/mongoose";
import PageScan from "@/models/PageScan";
import { Types } from "mongoose";
import OpenAI from "openai";
import { parseKwText } from "@/lib/scan/parseKw";

export const runtime = "nodejs";

export async function POST(req: Request) {
  try {
    const { pageId, notebookId, imageUrl } = (await req.json()) as {
      pageId: string;
      notebookId: string;
      imageUrl: string;
    };

    if (!Types.ObjectId.isValid(pageId) || !Types.ObjectId.isValid(notebookId) || !imageUrl) {
      return NextResponse.json({ error: "bad payload" }, { status: 400 });
    }

    await connectToDB();

    // upsert: pro Seite genau ein Job
    const job = await PageScan.findOneAndUpdate(
      { page: new Types.ObjectId(pageId) },
      {
        $set: {
          notebookId: new Types.ObjectId(notebookId),
          imageUrl,
          status: "queued",
          error: null,
        },
        $unset: { text: "", wa: "", cal: "", todo: "" },
      },
      { new: true, upsert: true }
    ).lean();

    // Verarbeitung getrennt starten (Antwort blockiert nicht)
    queueMicrotask(async () => {
      try {
        await PageScan.updateOne({ _id: job!._id }, { $set: { status: "processing" } });

        const apiKey = process.env.OPENROUTER_API_KEY;
        if (!apiKey) {
          throw new Error("Missing OPENROUTER_API_KEY");
        }

        // OpenRouter-Client (nutzt OpenAI SDK, aber mit baseURL von OpenRouter)
        const client = new OpenAI({
          apiKey,
          baseURL: "https://openrouter.ai/api/v1",
          // optional empfohlen:
          defaultHeaders: {
            "HTTP-Referer": "https://app.powerbook.at",
            "X-Title": "Powerbook Scan OCR",
          },
        } as any);

        // Prompt unverändert übernommen, aber als Chat + Vision
        const messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [
          {
            role: "user",
            content: [
              {
                type: "text",
                text:
                  "Give me the text provided based on this image. " +
                  "Can be German or English – write the response in the language which was provided originally. " +
                  "The user can also write keywords like 'CAL', 'TODO', 'WA' - ONLY if they are surrounded by a circle. " +
                  "Return it exactly as written, one line per item. " +
                  "Everytime you extracted a keyword put a '--kw' in front of it. " +
                  "Return only the extracted text (preserve line breaks).",
              },
              {
                type: "image_url",
                image_url: {
                  url: imageUrl,
                  detail: "low", // gleiches Detail wie vorher
                },
              },
            ],
          },
        ];

        // Modellwahl: nimm dasselbe Mini-/4o-Modell via OpenRouter-Namespace
        // Wenn du ein anderes Modell willst, in der DB/Settings pflegen.
        const model = "openai/gpt-4o-mini";

        const resp = await client.chat.completions.create({
          model,
          messages,
          temperature: 0,
          max_tokens: 4000, // großzügig, wie bisher Responses API es implizit zuließ
        });

        const ocrText = resp.choices?.[0]?.message?.content ?? "";
        const { cleanedText, wa, cal, todo } = parseKwText(ocrText);

        await PageScan.updateOne(
          { _id: job!._id },
          {
            $set: {
              status: "succeeded",
              text: cleanedText,
              wa,
              cal,
              todo,
              error: null,
            },
          }
        );
      } catch (err) {
        await PageScan.updateOne(
          { _id: job!._id },
          { $set: { status: "failed", error: (err as Error)?.message ?? "scan failed" } }
        );
      }
    });

    return NextResponse.json({ jobId: job!._id, status: "queued" });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}
