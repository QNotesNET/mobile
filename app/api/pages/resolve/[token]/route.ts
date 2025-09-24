// app/api/pages/resolve/[token]/route.ts
export const runtime = "nodejs"; // Mongoose benötigt Node-Runtime

import { NextResponse } from "next/server";
import { connectToDB } from "@/lib/mongoose";
import Page from "@/models/PageModel";

export async function GET(
  _req: Request,
  { params }: { params: { token: string } }
) {
  await connectToDB();

  const page = await Page.findOne({ pageToken: params.token }).lean();
  if (!page) return NextResponse.json({ error: "Not found" }, { status: 404 });

  return NextResponse.json({
    pageId: String(page._id),
    notebookId: String(page.notebookId),
    pageIndex: page.pageIndex,
  });
}
