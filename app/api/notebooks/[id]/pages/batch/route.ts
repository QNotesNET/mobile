// app/api/notebooks/[id]/pages/batch/route.ts
import { NextResponse } from "next/server";
import { Types } from "mongoose";
import { connectToDB } from "@/lib/mongoose";
import { getCurrentUser } from "@/lib/session";
import Notebook from "@/models/Notebook";
import Page from "@/models/PageModel";
import { genPageToken } from "@/lib/tokens";

export async function POST(
  req: Request,
  ctx: { params: Promise<{ id: string }> } // <- params ist ein Promise
) {
  await connectToDB();

  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id: nbId } = await ctx.params; // <- awaiten
  if (!Types.ObjectId.isValid(nbId)) {
    return NextResponse.json({ error: "Bad id" }, { status: 400 });
  }

  const nb = await Notebook.findOne({ _id: nbId, ownerId: user.id }).lean();
  if (!nb) return NextResponse.json({ error: "Notebook not found" }, { status: 404 });

  const body = await req.json().catch(() => ({} as Partial<{ from: number; to: number }>));
  const start = Math.max(1, Number(body.from ?? 1));
  const end = Math.max(start, Number(body.to ?? 10));

  const docs = [];
  for (let i = start; i <= end; i++) {
    docs.push({ notebookId: nbId, pageIndex: i, pageToken: genPageToken(), images: [] });
  }

  // ordered: false -> versucht restliche Inserts auch bei Duplikaten
  await Page.insertMany(docs, { ordered: false }).catch(() => {});

  const created = await Page.find({ notebookId: nbId, pageIndex: { $gte: start, $lte: end } })
    .select({ pageIndex: 1, pageToken: 1, _id: 0 })
    .sort({ pageIndex: 1 })
    .lean<{ pageIndex: number; pageToken: string }[]>();

  return NextResponse.json({ pages: created });
}
