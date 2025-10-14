import { NextResponse } from "next/server";
import { connectToDB } from "@/lib/mongoose";
import PageScan from "@/models/PageScan";
import { Types } from "mongoose";

export const runtime = "nodejs";

export async function GET(_: Request, ctx: { params: Promise<{ pageId: string }> }) {
  try {
    const { pageId } = await ctx.params;
    if (!Types.ObjectId.isValid(pageId)) return NextResponse.json({ error: "bad pageId" }, { status: 400 });

    await connectToDB();
    const job = await PageScan.findOne({ page: new Types.ObjectId(pageId) })
      .select({ page: 1, notebookId: 1, imageUrl: 1, status: 1, text: 1, wa: 1, cal: 1, todo: 1, error: 1, updatedAt: 1 })
      .lean();

    return NextResponse.json({ job: job ?? null });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}
