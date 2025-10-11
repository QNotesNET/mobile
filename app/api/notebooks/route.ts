// app/api/notebooks/route.ts
import { NextResponse } from "next/server";
import { connectToDB } from "@/lib/mongoose";
import Notebook from "@/models/Notebook";
import { getCurrentUser } from "@/lib/session";
import { Types } from "mongoose";

export async function GET() {
  await connectToDB();
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const uidStr = String(user.id);
  let uidObj: Types.ObjectId | null = null;
  try {
    uidObj = new Types.ObjectId(uidStr);
  } catch {
    uidObj = null;
  }

  // 🔎 Aggregation: vergleicht ownerId als ObjectId, als String
  // und zusätzlich ownerId->toString() gegen uidStr (falls ownerId ObjectId und wir String vergleichen).
  const pipeline: any[] = [
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
    { $project: { title: 1, createdAt: 1, updatedAt: 1 } },
  ];

  const items = await Notebook.aggregate(pipeline).exec();
  return NextResponse.json({ items });
}

export async function POST(req: Request) {
  await connectToDB();
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { title } = await req.json().catch(() => ({}));
  if (!title || typeof title !== "string") {
    return NextResponse.json({ error: "Missing title" }, { status: 400 });
  }

  const uidStr = String(user.id);
  let ownerId: any = uidStr;
  try {
    ownerId = new Types.ObjectId(uidStr); // ✅ ab jetzt als ObjectId speichern
  } catch {
    // Fallback auf String, falls user.id kein ObjectId-Format hätte
  }

  const nb = await Notebook.create({ title: title.trim(), ownerId });
  return NextResponse.json({ item: { id: String(nb._id), title: nb.title } }, { status: 201 });
}
