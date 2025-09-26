// app/api/pages/resolve/[token]/route.ts
import { NextResponse } from "next/server";
import { connectToDB } from "@/lib/mongoose";
import Page from "@/models/PageModel";
import { Types } from "mongoose";

type LeanResolvedPage = {
  _id: Types.ObjectId;
  notebookId: Types.ObjectId;
  pageIndex: number;
};

export async function GET(
  _req: Request,
  ctx: { params: Promise<{ token: string }> } // params ist ein Promise (Next 15)
) {
  await connectToDB();

  const { token } = await ctx.params;
  if (!token) {
    return NextResponse.json({ error: "Missing token" }, { status: 400 });
  }

  const page = await Page.findOne({ pageToken: token })
    .select({ _id: 1, notebookId: 1, pageIndex: 1 })
    .lean<LeanResolvedPage | null>();

  if (!page) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json({
    pageId: String(page._id),
    notebookId: String(page.notebookId),
    pageIndex: page.pageIndex,
  });
}
