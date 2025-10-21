// lib/google-tasks.ts
/* eslint-disable @typescript-eslint/no-explicit-any */
import { Types } from "mongoose";
import { TaskList } from "@/models/TaskList";
import { Task } from "@/models/Task";
import { googleFetch } from "@/lib/google-api";
import connectToDB from "@/lib/mongoose";

export async function ensureLocalGoogleTaskList(userId: string) {
  await connectToDB();
  let list = await TaskList.findOne({ userId, name: "Google Tasks" }).lean();
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
  // 1) Tasklisten holen
  const listsJson = await googleFetch(userId, "https://tasks.googleapis.com/tasks/v1/users/@me/lists");
  const items: any[] = listsJson.items || [];
  if (!items.length) return { imported: 0 };

  const primary =
    items.find((l) => String(l.title).toLowerCase() === "tasks") || // Standardtitel
    items[0];

  // 2) Tasks aus der Google-Liste holen (nur offene)
  const tasksJson = await googleFetch(
    userId,
    `https://tasks.googleapis.com/tasks/v1/lists/${encodeURIComponent(primary.id)}/tasks?showCompleted=false&maxResults=200`
  );
  const gTasks: any[] = tasksJson.items || [];
  if (!gTasks.length) return { imported: 0 };

  // 3) Einfacher Import: offene Aufgaben als neue lokale Tasks anlegen (ohne Dedupe)
  const baseOrder = await Task.countDocuments({ listId: localListId });
  const now = new Date();

  const payload = gTasks.map((t, i) => ({
    title: String(t.title || "").slice(0, 300) || "(Ohne Titel)",
    note: String(t.notes || ""),
    completed: false,
    dueAt: t.due ? new Date(t.due) : null,
    order: baseOrder + i,
    priority: "none" as const,
    userId: new Types.ObjectId(userId),
    listId: new Types.ObjectId(localListId),
    createdAt: now,
    updatedAt: now,
  }));

  if (payload.length) {
    const ins = await Task.insertMany(payload);
    return { imported: ins.length };
  }
  return { imported: 0 };
}
