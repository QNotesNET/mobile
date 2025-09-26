// app/api/notebooks/[id]/route.ts
import { NextResponse } from "next/server";
import { connectToDB } from "@/lib/mongoose";
import Notebook from "@/models/Notebook";
import { getCurrentUser } from "@/lib/session";
import { Types } from "mongoose";

export async function PATCH(
  req: Request,
  ctx: { params: Promise<{ id: string }> } // ⬅ params ist ein Promise
) {
  await connectToDB();

  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await ctx.params; // ⬅ awaiten
  if (!Types.ObjectId.isValid(id)) {
    return NextResponse.json({ error: "Bad id" }, { status: 400 });
  }

  const body = await req.json().catch(() => ({} as Partial<{ title: string }>));
  const title = typeof body.title === "string" ? body.title.trim() : undefined;
  if (!title) {
    return NextResponse.json({ error: "Missing title" }, { status: 400 });
  }

  const nb = await Notebook.findOneAndUpdate(
    { _id: id, ownerId: user.id },
    { $set: { title } },
    { new: true }
  )
    .select({ _id: 1, title: 1 })
    .lean<{ _id: Types.ObjectId; title: string } | null>();

  if (!nb) return NextResponse.json({ error: "Not found" }, { status: 404 });

  return NextResponse.json({ item: { id: String(nb._id), title: nb.title } });
}

export async function DELETE(
  _req: Request,
  ctx: { params: Promise<{ id: string }> } // ⬅ params ist ein Promise
) {
  await connectToDB();

  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await ctx.params; // ⬅ awaiten
  if (!Types.ObjectId.isValid(id)) {
    return NextResponse.json({ error: "Bad id" }, { status: 400 });
  }

  const res = await Notebook.deleteOne({ _id: id, ownerId: user.id });
  if (res.deletedCount === 0) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  return NextResponse.json({ ok: true });
}
