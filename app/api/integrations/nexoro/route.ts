import { NextResponse } from "next/server";
import { connectToDB } from "@/lib/mongoose";
import User from "@/models/User";
import Notebook from "@/models/Notebook";
import PagesContext from "@/models/PagesContext";
import { Types } from "mongoose";

export const runtime = "nodejs";

type UserLean = { _id: Types.ObjectId; nexoroUser?: string; nexoroDomain?: string };
type NotebookLean = { _id: Types.ObjectId; ownerId: Types.ObjectId };
type ContextLean = {
  notebookId: string;
  page: Types.ObjectId;
  imageUrl?: string;
  text?: string;
  wa?: string[];
  cal?: string[];
  todo?: string[];
};

type Action = {
  type: "TODO" | "CAL" | "WA";
  title: string;
  content: string;
  contactName: string | null;
  phone: string | null;
  datetime: string | null;
};

function trimOrNull(v?: string | null): string | null {
  if (typeof v !== "string") return null;
  const t = v.trim();
  return t === "" ? null : t;
}
function parseWA(s: string): { contactName: string | null; content: string } {
  const m =
    s.match(/^\s*([^:\-\u2013>\u2192]+)\s*(?:[:\-–>\u2192]+)\s*(.+)\s*$/u) ||
    s.match(/^\s*([^:]+):\s*(.+)\s*$/u);
  if (m) {
    const name = trimOrNull(m[1]);
    const body = (m[2] || "").trim();
    return { contactName: name, content: body };
  }
  return { contactName: null, content: s.trim() };
}
function titleFromCal(s: string): string {
  const t = s.trim();
  const timeLike = /\b(\d{1,2}[:.]\d{2})\b/;
  if (timeLike.test(t)) {
    const idx = t.search(timeLike);
    if (idx > 0) return t.slice(0, idx).trim().replace(/[-–,:]*\s*$/, "");
  }
  const m = t.match(/^\s*([^:]{2,}):\s*.+$/);
  if (m) return m[1].trim();
  return t;
}
function titleFromTodo(s: string): string {
  const t = s.trim().replace(/\.\.\.$/, "");
  const m = t.match(/^\s*([^:]{2,}):\s*(.+)$/);
  if (m) return m[2].trim();
  return t;
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const domain = (searchParams.get("nexoroDomain") || "").trim();
    if (!domain) {
      return NextResponse.json({ response: "Error", error: "Missing nexoroDomain" }, { status: 400 });
    }

    await connectToDB();

    // 1) valide nexoro-User dieser Domain
    const usersRaw = await User.find(
      { nexoroDomain: domain },
      { _id: 1, nexoroUser: 1, nexoroDomain: 1 }
    ).lean<UserLean[]>();
    const users = usersRaw.filter(
      (u) =>
        typeof u?.nexoroUser === "string" &&
        u.nexoroUser.trim() !== "" &&
        typeof u?.nexoroDomain === "string" &&
        u.nexoroDomain.trim() === domain
    );
    if (users.length === 0) {
      return NextResponse.json({ response: "Success", data: {} });
    }

    // 2) Notebooks dieser User
    const userIds: Types.ObjectId[] = users.map((u) => u._id);
    const notebooks = await Notebook.find(
      { ownerId: { $in: userIds } },
      { _id: 1, ownerId: 1 }
    ).lean<NotebookLean[]>();

    const allNotebookIdsAsString = notebooks.map((n) => String(n._id));
    if (allNotebookIdsAsString.length === 0) {
      return NextResponse.json({ response: "Success", data: {} });
    }

    // 3) Passende PagesContexts
    const contexts = await PagesContext.find(
      { notebookId: { $in: allNotebookIdsAsString } },
      { notebookId: 1, page: 1, imageUrl: 1, text: 1, wa: 1, cal: 1, todo: 1 }
    ).lean<ContextLean[]>();

    // 4) Gruppieren: notebookId -> pageId -> { image, actions[] }
    const data: Record<
      string,
      Record<
        string,
        {
          image: string;
          actions: Action[];
        }
      >
    > = {};

    for (const c of contexts) {
      const nb = c.notebookId;
      const pageId = String(c.page);
      const image = c.imageUrl ?? "";

      if (!data[nb]) data[nb] = {};
      if (!data[nb][pageId]) data[nb][pageId] = { image, actions: [] };

      // WA
      for (const s of c.wa ?? []) {
        const { contactName, content } = parseWA(s);
        data[nb][pageId].actions.push({
          type: "WA",
          title: "WA-Nachricht",
          content,
          contactName,
          phone: null,
          datetime: null,
        });
      }
      // CAL
      for (const s of c.cal ?? []) {
        const content = s.trim();
        data[nb][pageId].actions.push({
          type: "CAL",
          title: titleFromCal(content),
          content,
          contactName: null,
          phone: null,
          datetime: null,
        });
      }
      // TODO
      for (const s of c.todo ?? []) {
        const content = s.trim();
        data[nb][pageId].actions.push({
          type: "TODO",
          title: titleFromTodo(content),
          content,
          contactName: null,
          phone: null,
          datetime: null,
        });
      }
    }

    return NextResponse.json({ response: "Success", data });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Server error";
    console.error("[GET /api/integrations/nexoro] error:", message);
    return NextResponse.json({ response: "Error", error: message }, { status: 500 });
  }
}
