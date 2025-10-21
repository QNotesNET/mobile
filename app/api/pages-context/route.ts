/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextResponse } from "next/server";
import { Types } from "mongoose";
import connectToDB from "@/lib/mongoose";
import PagesContext from "@/models/PagesContext";
import { Task } from "@/models/Task";
import { TaskList } from "@/models/TaskList";
import Notebook from "@/models/Notebook";
import { Calendar as CalendarModel } from "@/models/Calendar";
import { CalendarEvent } from "@/models/CalendarEvent";

/** helpers */
function snapMinute15(m: number) {
  const r = Math.round(m / 15) * 15;
  return r >= 60 ? 45 : r;
}
function makeUTC(y: number, m: number, d: number, hh = 0, mm = 0) {
  return new Date(Date.UTC(y, m - 1, d, hh, mm, 0, 0));
}
function endOfDayUTC(y: number, m: number, d: number) {
  return new Date(Date.UTC(y, m - 1, d, 23, 59, 59, 999));
}

/** robust de-Parser: 14.12.2025 17:00, 14.12.25, 14.12., 17:00-18:15, ganztägig etc. */
function parseCalLine(
  input: string
): { title: string; start: Date; end: Date; allDay: boolean } | null {
  const str = String(input || "").trim();
  if (!str) return null;

  const dateRe = /\b([0-3]?\d)[.\-/]([01]?\d)(?:[.\-/]((?:20)?\d{2}))?\b/;
  const timeRangeRe =
    /\b((?:[01]?\d|2[0-3])[:.][0-5]\d)\s*[-–]\s*((?:[01]?\d|2[0-3])[:.][0-5]\d)\b/;
  const timeRe = /\b((?:[01]?\d|2[0-3])[:.][0-5]\d)\b/;
  const allDayKw = /\bganzt(ägig|ag)\b/i;

  const dm = str.match(dateRe);
  if (!dm) return null;

  const day = Number(dm[1]);
  const month = Number(dm[2]);
  let year = dm[3] ? Number(dm[3]) : NaN;
  if (!year || String(year).length <= 2) {
    const nowY = new Date().getUTCFullYear();
    year = !isNaN(year) ? (year < 100 ? year + 2000 : year) : nowY;
  }

  let title = str
    .replace(dm[0], " ")
    .replace(/\bum\b|\bam\b|\bvon\b|\bbis\b|\buhr\b/gi, " ")
    .replace(/\s{2,}/g, " ")
    .trim();

  const isAllDay = allDayKw.test(str);

  const tr = str.match(timeRangeRe);
  if (tr && !isAllDay) {
    const [h1, m1] = tr[1].replace(".", ":").split(":").map(Number);
    const [h2, m2] = tr[2].replace(".", ":").split(":").map(Number);
    const s = makeUTC(year, month, day, h1, snapMinute15(m1));
    let e = makeUTC(year, month, day, h2, snapMinute15(m2));
    if (e <= s) e = makeUTC(year, month, day, h1, snapMinute15(m1 + 60));
    title =
      title
        .replace(tr[0], " ")
        .replace(/\s{2,}/g, " ")
        .trim() || `${day}.${month}.${year}`;
    return { title, start: s, end: e, allDay: false };
  }

  const t1 = str.match(timeRe);
  if (t1 && !isAllDay) {
    const [hh, mm] = t1[1].replace(".", ":").split(":").map(Number);
    const s = makeUTC(year, month, day, hh, snapMinute15(mm));
    const e = makeUTC(year, month, day, hh, snapMinute15(mm + 60));
    title =
      title
        .replace(t1[0], " ")
        .replace(/\s{2,}/g, " ")
        .trim() || `${day}.${month}.${year}`;
    return { title, start: s, end: e, allDay: false };
  }

  const s = makeUTC(year, month, day, 0, 0);
  const e = endOfDayUTC(year, month, day);
  title = title || `${day}.${month}.${year}`;
  return { title, start: s, end: e, allDay: true };
}

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

    const todosArr: string[] = Array.isArray(todo)
      ? todo.map((s: any) => String(s).trim()).filter(Boolean)
      : [];
    const calsArr: string[] = Array.isArray(cal)
      ? cal.map((s: any) => String(s).trim()).filter(Boolean)
      : [];

    let createdTasks: string[] = [];
    let createdEvents: string[] = [];

    if (notebookid && Types.ObjectId.isValid(notebookid)) {
      const nb: any = await Notebook.findById(notebookid).lean();
      const userId = nb ? nb.ownerId : undefined;

      if (userId) {
        /** TODOs -> TaskList "Powerbooks" */
        if (todosArr.length > 0) {
          let listDoc: any = await TaskList.findOne({
            userId,
            name: "Powerbooks",
          }).lean();
          if (!listDoc) {
            const created = await TaskList.create({
              name: "Powerbooks",
              userId,
              createdAt: new Date(),
              updatedAt: new Date(),
            });
            listDoc = created.toObject();
          }
          const listId = (listDoc as any)?._id;
          const baseOrder = listId ? await Task.countDocuments({ listId }) : 0;
          const now = new Date();

          const payload = todosArr.map((t, i) => ({
            title: t.slice(0, 300),
            note: "",
            completed: false,
            dueAt: null,
            order: baseOrder + i,
            priority: "none",
            userId,
            listId,
            createdAt: now,
            updatedAt: now,
          }));
          const res = await Task.insertMany(payload);
          createdTasks = res.map((r: any) => String(r._id));
        }

        /** CAL -> Calendar "Powerbooks" + CalendarEvent docs */
        if (calsArr.length > 0) {
          let calendarDoc: any = await CalendarModel.findOne({
            userId,
            name: "Powerbooks",
          }).lean();

          if (!calendarDoc) {
            const created = await CalendarModel.create({
              name: "Powerbooks",
              color: "#000000",
              userId,
              isDefault: true,
              createdAt: new Date(),
              updatedAt: new Date(),
            });
            calendarDoc = created.toObject();
          }

          const calendarId = (calendarDoc as any)?._id;
          const prepared: any[] = [];

          for (const raw of calsArr) {
            const parsed = parseCalLine(raw);
            if (!parsed) continue;
            prepared.push({
              title: parsed.title.slice(0, 300),
              description: "",
              location: "",
              start: parsed.start,
              end: parsed.end,
              allDay: parsed.allDay,
              calendarId,
              userId,
              createdAt: new Date(),
              updatedAt: new Date(),
            });
          }

          if (prepared.length > 0) {
            // wichtig: unser Model heißt CalendarEvent (nicht Event)
            const ins = await (CalendarEvent as any).insertMany(prepared);
            createdEvents = ins.map((x: any) => String(x._id));
          }
        }
      }
    }

    return NextResponse.json({
      ok: true,
      id: doc._id,
      createdTasks,
      createdEvents,
    });
  } catch (err) {
    console.error("[pages-context POST] error:", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const pageId = searchParams.get("pageId");

    if (!pageId || !Types.ObjectId.isValid(pageId)) {
      return NextResponse.json(
        { error: "Missing or invalid pageId" },
        { status: 400 }
      );
    }

    await connectToDB();

    const doc = await PagesContext.findOne({
      page: new Types.ObjectId(pageId),
    })
      .select({
        _id: 1,
        page: 1,
        notebookId: 1,
        imageUrl: 1,
        text: 1,
        wa: 1,
        cal: 1,
        todo: 1,
        createdAt: 1,
        updatedAt: 1,
      })
      .sort({ createdAt: -1 }) // falls mehrere Einträge existieren, nimm den neuesten
      .lean();

    if (!doc) {
      return NextResponse.json(
        { error: "No pages-context found for given pageId" },
        { status: 404 }
      );
    }

    return NextResponse.json({ ok: true, data: { ...doc, id: String(doc._id) } });
  } catch (err) {
    console.error("[pages-context GET] error:", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}