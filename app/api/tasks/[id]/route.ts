/* eslint-disable @typescript-eslint/no-explicit-any */
// app/api/tasks/[id]/route.ts
import { NextResponse } from "next/server";
import { connectToDB } from "@/lib/mongoose";
import { Task } from "@/models/Task";
import { TaskList } from "@/models/TaskList";
import { Types } from "mongoose";
import { googleFetch } from "@/lib/google-api";
import {
  getPrimaryGoogleListId,
  mapLocalToGoogleBody,
} from "@/lib/google-tasks-helpers";

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

  const prev = await Task.findById(id).lean();
  if (!prev) return NextResponse.json({ error: "not found" }, { status: 404 });

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

  let movedIntoGoogle = false;
  let movedOutOfGoogle = false;

  if (body.listId) {
    if (!Types.ObjectId.isValid(body.listId))
      return NextResponse.json({ error: "invalid listId" }, { status: 400 });
    const newList = await TaskList.findById(body.listId).lean();
    if (!newList)
      return NextResponse.json(
        { error: "TaskList not found" },
        { status: 404 }
      );
    patch.listId = body.listId;

    const wasGoogle = prev.source === "google";
    // @ts-expect-error --- gibts scho
    const isGoogle = newList.name === "Google Tasks";
    movedIntoGoogle = !wasGoogle && isGoogle;
    movedOutOfGoogle = wasGoogle && !isGoogle;
  }

  // 1) Lokal updaten
  const updated = await Task.findByIdAndUpdate(id, patch, { new: true }).lean();
  if (!updated)
    return NextResponse.json({ error: "not found" }, { status: 404 });

  // 2) Mirroring
  try {
    if (movedIntoGoogle) {
      // neu bei Google anlegen
      const { id: primaryId } = await getPrimaryGoogleListId(
        String(updated.userId)
      );
      const gTask = await googleFetch(
        String(updated.userId),
        `https://tasks.googleapis.com/tasks/v1/lists/${encodeURIComponent(
          primaryId
        )}/tasks`,
        { method: "POST", body: JSON.stringify(mapLocalToGoogleBody(updated)) }
      );
      await Task.findByIdAndUpdate(updated._id, {
        source: "google",
        sourceId: gTask.id,
        sourceListId: primaryId,
        sourceEtag: gTask.etag || null,
        sourceUpdatedAt: gTask.updated ? new Date(gTask.updated) : new Date(),
      });
    } else if (movedOutOfGoogle) {
      // bei Google löschen und Mapping entfernen
      if (prev.sourceId && prev.sourceListId) {
        await googleFetch(
          String(updated.userId),
          `https://tasks.googleapis.com/tasks/v1/lists/${encodeURIComponent(
            prev.sourceListId
          )}/tasks/${encodeURIComponent(prev.sourceId)}`,
          { method: "DELETE" }
        );
      }
      await Task.findByIdAndUpdate(updated._id, {
        source: "local",
        sourceId: null,
        sourceListId: null,
        sourceEtag: null,
        sourceUpdatedAt: null,
      });
    } else {
      // normaler Update-Fall
      const isGoogleTask =
        prev.source === "google" || updated.source === "google";
      if (isGoogleTask) {
        const listId = String(prev.sourceListId || updated.sourceListId);
        const taskId = String(prev.sourceId || updated.sourceId);
        const gTask = await googleFetch(
          String(updated.userId),
          `https://tasks.googleapis.com/tasks/v1/lists/${encodeURIComponent(
            listId
          )}/tasks/${encodeURIComponent(taskId)}`,
          {
            method: "PATCH",
            body: JSON.stringify(mapLocalToGoogleBody(updated)),
          }
        );
        await Task.findByIdAndUpdate(updated._id, {
          sourceEtag: gTask.etag || null,
          sourceUpdatedAt: gTask.updated ? new Date(gTask.updated) : new Date(),
        });
      }
    }
  } catch (e) {
    console.warn("Google mirror PATCH failed (non-fatal):", e);
  }

  return NextResponse.json(await Task.findById(id).lean());
}

export async function DELETE(_req: Request, context: any) {
  await connectToDB();
  const id = context.params.id as string;
  const prev = await Task.findById(id).lean();
  if (!prev) return NextResponse.json({ error: "not found" }, { status: 404 });

  try {
    if (prev.source === "google" && prev.sourceId && prev.sourceListId) {
      await googleFetch(
        String(prev.userId),
        `https://tasks.googleapis.com/tasks/v1/lists/${encodeURIComponent(
          prev.sourceListId
        )}/tasks/${encodeURIComponent(prev.sourceId)}`,
        { method: "DELETE" }
      );
    }
  } catch (e) {
    console.warn("Google mirror DELETE failed (non-fatal):", e);
  }

  await Task.findByIdAndDelete(id).lean();
  return NextResponse.json({ ok: true });
}
