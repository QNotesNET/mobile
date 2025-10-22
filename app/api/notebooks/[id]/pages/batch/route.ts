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
  ctx: { params: Promise<{ id: string }> } // params ist ein Promise
) {
  await connectToDB();

  // params awaiten
  const { id: nbId } = await ctx.params;
  if (!Types.ObjectId.isValid(nbId)) {
    return NextResponse.json({ error: "Bad id" }, { status: 400 });
  }

  // interner Aufruf? -> Owner-Check überspringen
  const url = new URL(req.url);
  const isInternal =
    url.searchParams.get("internal") === "1" ||
    req.headers.get("x-internal") === "1";

  // Notebook lookup
  let nb: { _id: Types.ObjectId } | null = null;

  if (isInternal) {
    // Nur nach _id prüfen, kein Owner nötig
    nb = await Notebook.findOne(
      { _id: new Types.ObjectId(nbId) },
      { _id: 1 }
    ).lean<{ _id: Types.ObjectId }>() as { _id: Types.ObjectId } | null;
  } else {
    // Extern: Auth + Owner-Check
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const uidStr = String(user.id);
    let uidObj: Types.ObjectId | null = null;
    try { uidObj = new Types.ObjectId(uidStr); } catch { uidObj = null; }

    nb = await Notebook.findOne(
      {
        _id: new Types.ObjectId(nbId),
        $or: [
          ...(uidObj ? [{ ownerId: uidObj }] : []),
          { ownerId: uidStr },
        ],
      },
      { _id: 1 }
    ).lean<{ _id: Types.ObjectId }>() as { _id: Types.ObjectId } | null;
  }

  if (!nb) {
    return NextResponse.json({ error: "Notebook not found" }, { status: 404 });
  }

  // Body lesen und Grenzen validieren
  const body = (await req.json().catch(() => ({} as Partial<{ from: number; to: number }>)));
  const start = Math.max(1, Number(body.from ?? 1));
  const end = Math.max(start, Number(body.to ?? 10));

  // Seiten-Dokumente bauen
  const docs: Array<{
    notebookId: Types.ObjectId;
    pageIndex: number;
    pageToken: string;
    images: unknown[];
  }> = [];

  for (let i = start; i <= end; i++) {
    docs.push({
      notebookId: new Types.ObjectId(nbId),
      pageIndex: i,
      pageToken: genPageToken(),
      images: [],
    });
  }

  // ordered:false → versucht restliche Inserts auch bei Duplikaten
  await Page.insertMany(docs, { ordered: false }).catch(() => { /* ignore duplicate errors */ });

  // frisch erzeugte/ vorhandene Seiten für den Bereich zurückgeben
  const created = await Page.find(
    { notebookId: new Types.ObjectId(nbId), pageIndex: { $gte: start, $lte: end } },
    { pageIndex: 1, pageToken: 1, _id: 0 }
  )
    .sort({ pageIndex: 1 })
    .lean<{ pageIndex: number; pageToken: string }[]>();

  return NextResponse.json({ pages: created }, { status: 201 });
}
