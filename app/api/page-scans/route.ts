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

    // Verarbeitung "detacht" starten (keine Antwort blockieren)
    queueMicrotask(async () => {
      try {
        await PageScan.updateOne({ _id: job!._id }, { $set: { status: "processing" } });

        const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

        const resp = await openai.responses.create({
          model: "gpt-5",
          input: [
            {
              role: "user",
              content: [
                {
                  type: "input_text",
                  text:
                    "Give me the text provided based on this image. " +
                    "Can be German or English – write the response in the language which was provided originally. " +
                    "The user can also write keywords like 'CAL', 'TODO', 'WA' - ONLY if they are surrounded by a circle. " +
                    "Return it exactly as written, one line per item. " +
                    "Everytime you extracted a keyword put a '--kw' in front of it. " +
                    "Return only the extracted text (preserve line breaks).",
                },
                { type: "input_image", image_url: imageUrl, detail: "auto" },
              ],
            },
          ],
        });

        const ocrText = (resp as any).output_text as string || "";
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
