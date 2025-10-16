/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextResponse } from "next/server";
import { Types } from "mongoose";
import connectToDB from "@/lib/mongoose";
import PagesContext from "@/models/PagesContext";
import { Task } from "@/models/Task";
import { TaskList } from "@/models/TaskList";
import Notebook from "@/models/Notebook";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const {
      page,
      notebookid,
      imageUrl,
      text,
      wa = [],
      cal = [],
      todo = [],
    } = body || {};

    if (!page || !Types.ObjectId.isValid(page)) {
      return NextResponse.json(
        { error: "Invalid or missing page id" },
        { status: 400 }
      );
    }

    await connectToDB();

    const doc = await PagesContext.create({
      page: new Types.ObjectId(page),
      notebookId: notebookid || "",
      imageUrl: imageUrl || "",
      text: text || "",
      wa: Array.isArray(wa) ? wa : [],
      cal: Array.isArray(cal) ? cal : [],
      todo: Array.isArray(todo) ? todo : [],
    });

    const todos: string[] = Array.isArray(todo)
      ? todo.map((s: any) => String(s).trim()).filter(Boolean)
      : [];
    let createdTasks: string[] = [];

    if (todos.length > 0 && notebookid && Types.ObjectId.isValid(notebookid)) {
      const nb = await Notebook.findById(notebookid).lean();
      const userId = nb && !Array.isArray(nb) ? nb.ownerId : undefined;
      if (userId) {
        let list = await TaskList.findOne({
          userId,
          name: "Powerbooks",
        }).lean();
        if (!list) {
          list = (
            await TaskList.create({
              name: "Powerbooks",
              userId,
              createdAt: new Date(),
              updatedAt: new Date(),
            })
          ).toObject();
        }

        const listIdValue = Array.isArray(list) ? list[0]?._id : list?._id;
        const baseOrder = listIdValue ? await Task.countDocuments({ listId: listIdValue }) : 0;
        const now = new Date();

        const listId =
          Array.isArray(list) ? list[0]?._id : list?._id;

        const payload = todos.map((t, i) => ({
          title: t.slice(0, 300),
          note: "",
          completed: false,
          dueAt: null,
          order: baseOrder + i,
          priority: "none",
          userId,
          listId: listId,
          createdAt: now,
          updatedAt: now,
        }));

        const res = await Task.insertMany(payload);
        createdTasks = res.map((r) => String(r._id));
      }
    }

    return NextResponse.json({
      ok: true,
      id: doc._id,
      createdTasks,
    });
  } catch (err) {
    console.error("[pages-context POST] error:", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
