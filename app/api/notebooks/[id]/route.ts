import { NextResponse } from "next/server";
import { connectToDB } from "@/lib/mongoose";
import Notebook from "@/models/Notebook";
import { getCurrentUser } from "@/lib/session";
import { Types } from "mongoose";

export async function PATCH(
  req: Request,
  { params }: { params: { id: string } }
) {
  await connectToDB();
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!Types.ObjectId.isValid(params.id)) {
    return NextResponse.json({ error: "Bad id" }, { status: 400 });
  }

  const body = await req.json().catch(() => ({} as any));
  const title = typeof body.title === "string" ? body.title.trim() : undefined;
  if (!title) {
    return NextResponse.json({ error: "Missing title" }, { status: 400 });
  }

  const nb = await Notebook.findOneAndUpdate(
    { _id: params.id, ownerId: user.id },
    { $set: { title } },
    { new: true }
  )
    .select({ _id: 1, title: 1 }) // nur Felder, die wir brauchen
    .lean<{ _id: Types.ObjectId; title: string }>(); // <-- enger Typ

  if (!nb) return NextResponse.json({ error: "Not found" }, { status: 404 });

  return NextResponse.json({ item: { id: String(nb._id), title: nb.title } });
}

export async function DELETE(
  _req: Request,
  { params }: { params: { id: string } }
) {
  await connectToDB();
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!Types.ObjectId.isValid(params.id)) {
    return NextResponse.json({ error: "Bad id" }, { status: 400 });
  }

  const res = await Notebook.deleteOne({ _id: params.id, ownerId: user.id });
  if (res.deletedCount === 0) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  return NextResponse.json({ ok: true });
}
