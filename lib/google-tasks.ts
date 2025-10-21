// lib/google-tasks.ts
/* eslint-disable @typescript-eslint/no-explicit-any */
import { Types } from "mongoose";
import { TaskList } from "@/models/TaskList";
import { Task } from "@/models/Task";
import { googleFetch } from "@/lib/google-api";
import connectToDB from "@/lib/mongoose";

export async function ensureLocalGoogleTaskList(userId: string) {
  await connectToDB();
  const list = await TaskList.findOne({ userId, name: "Google Tasks" }).lean();
  if (list) return list;

  const now = new Date();
  const doc = await TaskList.create({
    name: "Google Tasks",
    userId: new Types.ObjectId(userId),
    createdAt: now,
    updatedAt: now,
  });
  return doc.toObject();
}

export async function importOpenGoogleTasksOnce(userId: string, localListId: string) {
  // 1) Google Task-Listen
  const listsJson = await googleFetch(userId, "https://tasks.googleapis.com/tasks/v1/users/@me/lists");
  const items: any[] = listsJson.items || [];
  if (!items.length) return { imported: 0, updated: 0 };

  const primary =
    items.find((l) => String(l.title).toLowerCase() === "tasks") || items[0];

  // 2) Offene Tasks holen
  const tasksJson = await googleFetch(
    userId,
    `https://tasks.googleapis.com/tasks/v1/lists/${encodeURIComponent(primary.id)}/tasks?showCompleted=false&maxResults=200`
  );
  const gTasks: any[] = tasksJson.items || [];
  if (!gTasks.length) return { imported: 0, updated: 0 };

  let imported = 0;
  let updated = 0;
  const now = new Date();

  for (const g of gTasks) {
    const sourceId = String(g.id);
    const existing = await Task.findOne({ userId, source: "google", sourceId }).lean();
    const base = {
      title: String(g.title || "").slice(0, 300) || "(Ohne Titel)",
      note: String(g.notes || ""),
      completed: g.status === "completed" ? true : false,
      dueAt: g.due ? new Date(g.due) : null,
      priority: "none" as const,
      userId: new Types.ObjectId(userId),
      listId: new Types.ObjectId(localListId),
      source: "google" as const,
      sourceId,
      sourceListId: String(primary.id),
      sourceEtag: g.etag || null,
      sourceUpdatedAt: g.updated ? new Date(g.updated) : now,
      updatedAt: now,
    };

    if (!existing) {
      await Task.create({
        ...base,
        order: 0,
        createdAt: now,
      });
      imported++;
    } else {
      // Nur updaten, wenn Google neuer ist
      const localNewer =
        existing.updatedAt &&
        base.sourceUpdatedAt &&
        new Date(existing.updatedAt).getTime() > new Date(base.sourceUpdatedAt).getTime();

      if (!localNewer) {
        await Task.findByIdAndUpdate(existing._id, base);
        updated++;
      }
    }
  }

  return { imported, updated };
}
