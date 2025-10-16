/* eslint-disable @typescript-eslint/no-explicit-any */
// app/api/lists/[id]/route.ts
import { NextResponse } from "next/server";
import { connectToDB } from "@/lib/mongoose";
import { TaskList } from "@/models/TaskList";
import { Task } from "@/models/Task";
import { Types } from "mongoose";

export async function PATCH(req: Request, context: any) {
  await connectToDB();
  const id = context.params.id;
  const body = await req.json();
  const name = body?.name ? String(body.name).trim() : null;
  if (!name)
    return NextResponse.json({ error: "name required" }, { status: 400 });

  const doc = await TaskList.findByIdAndUpdate(
    id,
    { name, updatedAt: new Date() },
    { new: true }
  ).lean();

  if (!doc) return NextResponse.json({ error: "not found" }, { status: 404 });
  return NextResponse.json(doc);
}

export async function DELETE(_req: Request, context: any) {
  await connectToDB();
  const id = context.params.id;
  if (!Types.ObjectId.isValid(id))
    return NextResponse.json({ error: "invalid id" }, { status: 400 });

  const list = await TaskList.findByIdAndDelete(id).lean();
  if (!list) return NextResponse.json({ error: "not found" }, { status: 404 });

  await Task.deleteMany({ listId: id });
  return NextResponse.json({ ok: true });
}
