import { NextResponse } from "next/server";
import { connectToDB } from "@/lib/mongoose";
import { TaskList } from "@/models/TaskList";
import { Task } from "@/models/Task";
import { Types } from "mongoose";

export async function GET(req: Request) {
  await connectToDB();
  const { searchParams } = new URL(req.url);
  const userId = searchParams.get("userId");
  const withCounts = searchParams.get("withCounts") === "true";

  if (!userId || !Types.ObjectId.isValid(userId)) {
    return NextResponse.json({ error: "userId required" }, { status: 400 });
  }

  const items = await TaskList.find({ userId }).sort({ createdAt: 1 }).lean();

  if (!withCounts) return NextResponse.json({ items });

  const counts = await Task.aggregate([
    { $match: { userId: new Types.ObjectId(userId), completed: false } },
    { $group: { _id: "$listId", openCount: { $sum: 1 } } },
  ]);

  const countMap = new Map<string, number>(
    counts.map((c) => [String(c._id), c.openCount as number])
  );

  const withOpen = items.map((l) => ({
    ...l,
    openCount: countMap.get(String(l._id)) ?? 0,
  }));

  return NextResponse.json({ items: withOpen });
}

export async function POST(req: Request) {
  await connectToDB();
  const body = await req.json();
  const { name, userId } = body || {};
  if (!name || !userId || !Types.ObjectId.isValid(userId))
    return NextResponse.json(
      { error: "name and userId required" },
      { status: 400 }
    );
  const now = new Date();
  const doc = await TaskList.create({
    name: String(name).trim(),
    userId,
    createdAt: now,
    updatedAt: now,
  });
  return NextResponse.json(doc.toObject(), { status: 201 });
}
