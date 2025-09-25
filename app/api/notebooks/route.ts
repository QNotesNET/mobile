import { NextResponse } from "next/server";
import { connectToDB } from "@/lib/mongoose";
import Notebook from "@/models/Notebook";
import { getCurrentUser } from "@/lib/session";

export async function GET() {
  await connectToDB();
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const items = await Notebook.find({ ownerId: user.id }).sort({ createdAt: -1 }).lean();
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
  const nb = await Notebook.create({ title: title.trim(), ownerId: user.id });
  return NextResponse.json({ item: { id: String(nb._id), title: nb.title } }, { status: 201 });
}
