import { NextResponse } from "next/server";
import { Types } from "mongoose";
import { connectToDB } from "@/lib/mongoose";
import { Calendar } from "@/models/Calendar";


export async function GET(req: Request) {
  await connectToDB();
  const { searchParams } = new URL(req.url);
  const userId = searchParams.get("userId");
  if (!userId || !Types.ObjectId.isValid(userId))
    return NextResponse.json({ error: "userId required" }, { status: 400 });
  const items = await Calendar.find({ userId })
    .sort({ isDefault: -1, createdAt: 1 })
    .lean();
  return NextResponse.json({ items });
}

export async function POST(req: Request) {
  await connectToDB();
  const body = await req.json();
  const { name, color = "#000000", userId, isDefault = false } = body || {};
  if (!name || !userId)
    return NextResponse.json(
      { error: "name and userId required" },
      { status: 400 }
    );
  if (isDefault)
    await Calendar.updateMany({ userId }, { $set: { isDefault: false } });
  const now = new Date();
  const doc = await Calendar.create({
    name: String(name).trim(),
    color,
    userId,
    isDefault,
    createdAt: now,
    updatedAt: now,
  });
  return NextResponse.json(doc.toObject(), { status: 201 });
}
