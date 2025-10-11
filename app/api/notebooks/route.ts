// app/api/notebooks/route.ts
import { NextResponse } from "next/server";
import { connectToDB } from "@/lib/mongoose";
import Notebook from "@/models/Notebook";
import { getCurrentUser } from "@/lib/session";
import { Types, PipelineStage } from "mongoose";
import type { ObjectId } from "mongodb";

type AggOut = {
  _id: ObjectId;
  title: string;
  createdAt?: Date;
  updatedAt?: Date;
  ownerId?: unknown;
  ownerIdStr?: string;
};

export async function GET() {
  await connectToDB();
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const uidStr = String(user.id);
  let uidObj: Types.ObjectId | null = null;
  try { uidObj = new Types.ObjectId(uidStr); } catch { uidObj = null; }

  const pipeline: PipelineStage[] = [
    { $addFields: { ownerIdStr: { $toString: "$ownerId" } } },
    {
      $match: {
        $or: [
          ...(uidObj ? [{ ownerId: uidObj }] : []),
          { ownerId: uidStr },
          { ownerIdStr: uidStr },
        ],
      },
    },
    { $sort: { createdAt: -1 } },
    { $project: { _id: 1, title: 1, createdAt: 1, updatedAt: 1 } },
  ];

  const docs = (await Notebook.aggregate(pipeline).exec()) as AggOut[];
  const items = docs.map((d) => ({
    id: String(d._id),
    title: d.title,
    createdAt: d.createdAt,
    updatedAt: d.updatedAt,
  }));

  return NextResponse.json({ items });
}

export async function POST(req: Request) {
  await connectToDB();
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = (await req.json().catch(() => ({}))) as { title?: unknown };
  const title = typeof body.title === "string" ? body.title.trim() : "";
  if (!title) {
    return NextResponse.json({ error: "Missing title" }, { status: 400 });
  }

  const uidStr = String(user.id);
  let ownerId: unknown = uidStr;
  try {
    ownerId = new Types.ObjectId(uidStr);
  } catch {
    // Fallback auf String, falls nötig
  }

  const nb = await Notebook.create({ title, ownerId });
  return NextResponse.json({ item: { id: String(nb._id), title: nb.title } }, { status: 201 });
}
