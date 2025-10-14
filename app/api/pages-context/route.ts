// app/api/pages-context/route.ts
import { NextResponse } from "next/server";
import { Types } from "mongoose";
import PagesContext from "@/models/PagesContext";
import connectToDB from "@/lib/mongoose";

export async function POST(req: Request) {
  try {
    const body = await req.json();

    const {
      page,           // pageId (string)
      notebookid,     // optional
      imageUrl,       // optional
      text,           // gesamter OCR-Text
      wa = [],        // string[]
      cal = [],       // string[]
      todo = [],      // string[]
    } = body || {};

    if (!page || !Types.ObjectId.isValid(page)) {
      return NextResponse.json({ error: "Invalid or missing page id" }, { status: 400 });
    }

    await connectToDB();

    const doc = await PagesContext.create({
      page: new Types.ObjectId(page),
      notebookId: notebookid || "",
      imageUrl: imageUrl || "",
      text: text || "",
      wa: Array.isArray(wa) ? wa : [],
      cal: Array.isArray(cal) ? cal : [],
      todo: Array.isArray(todo) ? todo : [],
    });

    return NextResponse.json({ ok: true, id: doc._id });
  } catch (err) {
    console.error("[pages-context POST] error:", err);
    return NextResponse.json({ error: err as string || "Server error" }, { status: 500 });
  }
}
