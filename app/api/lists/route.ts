import { NextResponse } from "next/server";
import { connectToDB } from "@/lib/mongoose";
import { TaskList } from "@/models/TaskList";
import { Types } from "mongoose";

export async function GET(req: Request) {
  await connectToDB();
  const { searchParams } = new URL(req.url);
  const userId = searchParams.get("userId");
  if (!userId || !Types.ObjectId.isValid(userId))
    return NextResponse.json({ error: "userId required" }, { status: 400 });
  const items = await TaskList.find({ userId }).sort({ createdAt: 1 }).lean();
  return NextResponse.json({ items });
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
