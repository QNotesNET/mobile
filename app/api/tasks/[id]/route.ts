/* eslint-disable @typescript-eslint/no-explicit-any */
// app/api/tasks/[id]/route.ts
import { NextResponse } from "next/server";
import { connectToDB } from "@/lib/mongoose";
import { Task } from "@/models/Task";
import { TaskList } from "@/models/TaskList";
import { Types } from "mongoose";

export async function GET(_req: Request, context: any) {
  await connectToDB();
  const id = context.params.id as string;
  const task = await Task.findById(id).lean();
  if (!task) return NextResponse.json({ error: "not found" }, { status: 404 });
  return NextResponse.json(task);
}

export async function PATCH(req: Request, context: any) {
  await connectToDB();
  const id = context.params.id as string;
  const body = await req.json();

  const patch: any = { updatedAt: new Date() };
  if (typeof body.title === "string") patch.title = body.title.trim();
  if (typeof body.note === "string") patch.note = body.note;
  if (typeof body.completed === "boolean") patch.completed = body.completed;
  if (body.dueAt === null) patch.dueAt = null;
  else if (body.dueAt) patch.dueAt = new Date(body.dueAt);
  if (Number.isFinite(body.order)) patch.order = Number(body.order);
  if (
    typeof body.priority === "string" &&
    ["none", "low", "medium", "high"].includes(body.priority)
  ) {
    patch.priority = body.priority;
  }
  if (body.listId) {
    if (!Types.ObjectId.isValid(body.listId))
      return NextResponse.json({ error: "invalid listId" }, { status: 400 });
    const list = await TaskList.exists({ _id: body.listId });
    if (!list)
      return NextResponse.json(
        { error: "TaskList not found" },
        { status: 404 }
      );
    patch.listId = body.listId;
  }

  const updated = await Task.findByIdAndUpdate(id, patch, { new: true }).lean();
  if (!updated)
    return NextResponse.json({ error: "not found" }, { status: 404 });
  return NextResponse.json(updated);
}

export async function DELETE(_req: Request, context: any) {
  await connectToDB();
  const id = context.params.id as string;
  const deleted = await Task.findByIdAndDelete(id).lean();
  if (!deleted)
    return NextResponse.json({ error: "not found" }, { status: 404 });
  return NextResponse.json({ ok: true });
}
