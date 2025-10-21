/* eslint-disable @typescript-eslint/no-explicit-any */
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

export async function GET(req: Request) {
  await connectToDB();
  const { searchParams } = new URL(req.url);
  const userId = searchParams.get("userId");
  const listId = searchParams.get("listId");
  const completed = searchParams.get("completed");
  const q = searchParams.get("q");
  const sortParam = searchParams.get("sort") || "order:1";
  const limit = Math.min(Number(searchParams.get("limit") ?? 200), 500);
  const skip = Math.max(Number(searchParams.get("skip") ?? 0), 0);

  const filter: any = {};
  if (userId && Types.ObjectId.isValid(userId)) filter.userId = userId;
  if (listId && Types.ObjectId.isValid(listId)) filter.listId = listId;
  if (completed === "true") filter.completed = true;
  if (completed === "false") filter.completed = false;
  if (q) filter.$text = { $search: q };

  const sort: Record<string, 1 | -1> = {};
  const [f, d] = sortParam.split(":");
  if (f) sort[f] = d === "1" ? 1 : -1;

  const [items, total] = await Promise.all([
    Task.find(filter).sort(sort).skip(skip).limit(limit).lean(),
    Task.countDocuments(filter),
  ]);
  return NextResponse.json({ items, total, skip, limit });
}

export async function POST(req: Request) {
  await connectToDB();
  const body = await req.json();
  const { title, note, dueAt, order, userId, listId, priority } = body || {};
  const prio: "none" | "low" | "medium" | "high" = [
    "none",
    "low",
    "medium",
    "high",
  ].includes(priority)
    ? priority
    : "none";
  if (!title || !userId || !listId)
    return NextResponse.json(
      { error: "title, userId, listId required" },
      { status: 400 }
    );
  const list = await TaskList.exists({ _id: listId, userId });
  if (!list)
    return NextResponse.json(
      { error: "TaskList not found for user" },
      { status: 404 }
    );
  const now = new Date();
  const doc = await Task.create({
    title: String(title).trim(),
    note: note ? String(note) : "",
    completed: false,
    dueAt: dueAt ? new Date(dueAt) : null,
    order: Number.isFinite(order) ? Number(order) : 0,
    priority: prio, // <— wichtig
    userId,
    listId,
    createdAt: now,
    updatedAt: now,
  });
  const created = doc.toObject();
  // Falls die Task in die "Google Tasks" Liste geschrieben wurde, versuche sie auch bei Google anzulegen
  try {
    const localList = await TaskList.findById(listId).lean();
    // @ts-expect-error --- gibts scho
    if (localList && localList.name === "Google Tasks") {
      const { id: primaryId } = await getPrimaryGoogleListId(userId);
      const gTask = await googleFetch(
        userId,
        `https://tasks.googleapis.com/tasks/v1/lists/${encodeURIComponent(
          primaryId
        )}/tasks`,
        { method: "POST", body: JSON.stringify(mapLocalToGoogleBody(created)) }
      );

      // Mapping anreichern
      await Task.findByIdAndUpdate(created._id, {
        source: "google",
        sourceId: gTask.id,
        sourceListId: primaryId,
        sourceEtag: gTask.etag || null,
        sourceUpdatedAt: gTask.updated ? new Date(gTask.updated) : new Date(),
      });
    }
  } catch (e) {
    console.warn("Mirroring to Google Tasks failed (non-fatal):", e);
  }
  return NextResponse.json(doc.toObject(), { status: 201 });
}
