// app/api/pages/[id]/images/route.ts
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { Types } from "mongoose";
import { connectToDB } from "@/lib/mongoose";
import { getCurrentUser } from "@/lib/session";
import Page from "@/models/PageModel";
import Notebook from "@/models/Notebook";

type Body = { url?: string };

export async function POST(req: Request, { params }: { params: { id: string } }) {
  try {
    await connectToDB();
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const pageId = params.id;
    if (!Types.ObjectId.isValid(pageId)) {
      return NextResponse.json({ error: "Bad id" }, { status: 400 });
    }

    const { url } = ((await req.json().catch(() => ({}))) as Body) || {};
    if (!url) return NextResponse.json({ error: "Missing url" }, { status: 400 });

    // ensure the page belongs to the user (via its notebook)
    const page = await Page.findById(pageId).select({ notebookId: 1 });
    if (!page) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const nb = await Notebook.findOne({ _id: page.notebookId, ownerId: user.id }).select({ _id: 1 });
    if (!nb) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    await Page.updateOne(
      { _id: pageId },
      { $push: { images: { url, createdAt: new Date().toISOString() } } }
    );

    return NextResponse.json({ ok: true, url });
  } catch (e) {
    console.error("add image error", e);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
