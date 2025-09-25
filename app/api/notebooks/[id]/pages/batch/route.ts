// app/api/notebooks/[id]/pages/batch/route.ts
import { NextResponse } from "next/server";
import { Types } from "mongoose";
import { connectToDB } from "@/lib/mongoose";
import { getCurrentUser } from "@/lib/session";
import Notebook from "@/models/Notebook";
import Page from "@/models/PageModel";
import { genPageToken } from "@/lib/tokens";

export async function POST(req: Request, { params }: { params: { id: string } }) {
  await connectToDB();
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!Types.ObjectId.isValid(params.id)) return NextResponse.json({ error: "Bad id" }, { status: 400 });

  const nb = await Notebook.findOne({ _id: params.id, ownerId: user.id }).lean();
  if (!nb) return NextResponse.json({ error: "Notebook not found" }, { status: 404 });

  const { from = 1, to = 10 } = await req.json().catch(() => ({}));
  const start = Math.max(1, Number(from));
  const end = Math.max(start, Number(to));

  const docs = [];
  for (let i = start; i <= end; i++) {
    docs.push({ notebookId: params.id, pageIndex: i, pageToken: genPageToken(), images: [] });
  }
  await Page.insertMany(docs, { ordered: false }).catch(() => {});
  const created = await Page.find({ notebookId: params.id, pageIndex: { $gte: start, $lte: end } })
    .select({ pageIndex: 1, pageToken: 1, _id: 0 })
    .sort({ pageIndex: 1 })
    .lean();

  return NextResponse.json({ pages: created });
}
