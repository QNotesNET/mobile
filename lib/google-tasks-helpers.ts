// lib/google-tasks-helpers.ts
/* eslint-disable @typescript-eslint/no-explicit-any */
import { Types } from "mongoose";
import { googleFetch } from "@/lib/google-api";
import { Task } from "@/models/Task";
import { TaskList } from "@/models/TaskList";

export async function getPrimaryGoogleListId(userId: string) {
  const lists = await googleFetch(userId, "https://tasks.googleapis.com/tasks/v1/users/@me/lists");
  const items: any[] = lists.items || [];
  if (!items.length) throw new Error("No Google Task lists found");
  const primary =
    items.find((l) => String(l.title).toLowerCase() === "tasks") || items[0];
  return { id: primary.id as string, title: String(primary.title) };
}

export function mapLocalToGoogleBody(local: any) {
  return {
    title: local.title,
    notes: local.note || undefined,
    due: local.dueAt ? new Date(local.dueAt).toISOString() : undefined,
    status: local.completed ? "completed" : "needsAction",
    // optional: completed: local.completed ? new Date().toISOString() : undefined,
  };
}

export async function upsertLocalFromGoogleTask(
  userId: string,
  localGoogleListId: string,
  g: any
) {
  // g: Google Task item
  const sourceId = String(g.id);
  const sourceListId = String(g.parent || g.listId || "unknown"); // listId wird von API nicht immer geliefert
  const title = (g.title || "(Ohne Titel)").slice(0, 300);
  const note = String(g.notes || "");
  const dueAt = g.due ? new Date(g.due) : null;
  const completed = g.status === "completed";
  const sourceUpdatedAt = g.updated ? new Date(g.updated) : new Date();

  const existing = await Task.findOne({ userId, source: "google", sourceId }).lean();

  if (g.deleted) {
    if (existing) await Task.findByIdAndDelete(existing._id);
    return { action: existing ? "deleted" : "noop" };
  }

  if (!existing) {
    const now = new Date();
    await Task.create({
      title,
      note,
      completed,
      dueAt,
      order: 0,
      priority: "none",
      userId: new Types.ObjectId(userId),
      listId: new Types.ObjectId(localGoogleListId),
      source: "google",
      sourceId,
      sourceListId,
      sourceEtag: g.etag || null,
      sourceUpdatedAt,
      createdAt: now,
      updatedAt: now,
    });
    return { action: "created" };
  }

  // Nur updaten, wenn Google neuer ist (Ping-Pong vermeiden)
  const localIsNewer =
    existing.sourceUpdatedAt && existing.updatedAt &&
    new Date(existing.updatedAt).getTime() > new Date(sourceUpdatedAt).getTime();

  if (localIsNewer) return { action: "skip_local_newer" };

  await Task.findByIdAndUpdate(existing._id, {
    title,
    note,
    completed,
    dueAt,
    sourceEtag: g.etag || null,
    sourceUpdatedAt,
    updatedAt: new Date(),
  });

  return { action: "updated" };
}
