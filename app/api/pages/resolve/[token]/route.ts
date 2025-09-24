// app/api/pages/resolve/[token]/route.ts
export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { connectToDB } from "@/lib/mongoose";
import PageModel, { PageDoc } from "@/models/PageModel";

export async function GET(req: Request) {
  // token direkt aus der URL ziehen, kein context-Param nötig
  const url = new URL(req.url);
  const segments = url.pathname.split("/"); // ["", "api", "pages", "resolve", "{token}"]
  const token = segments[segments.length - 1];

  if (!token) {
    return NextResponse.json({ error: "Missing token" }, { status: 400 });
  }

  await connectToDB();

  const page = await PageModel.findOne({ pageToken: token })
    .lean<PageDoc>()
    .exec();

  if (!page) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json({
    pageId: String(page._id),
    notebookId: String(page.notebookId),
    pageIndex: page.pageIndex,
  });
}
