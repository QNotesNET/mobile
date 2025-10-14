import { NextResponse } from "next/server";
import { connectToDB } from "@/lib/mongoose";
import User from "@/models/User";
import Notebook from "@/models/Notebook";
import PagesContext from "@/models/PagesContext";
import { Types } from "mongoose";

export const runtime = "nodejs";

// Lean-Typen
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

// ---- kleine Parser-Heuristiken (unverändert) ----
function trimOrNull(v?: string | null): string | null {
  if (typeof v !== "string") return null;
  const t = v.trim();
  return t === "" ? null : t;
}
// WA: "Name : Nachricht", "Name ; Nachricht", "Name；Nachricht", "Name：Nachricht",
//     "Name, Nachricht", "Name -> Nachricht", "Name → Nachricht", "Name - Nachricht"
function parseWA(s: string): { contactName: string | null; content: string } {
  const str = (s ?? "").trim();

  // Trenner: :, ;, ；(fullwidth semicolon), ：(fullwidth colon), ,(Komma),
  //          -, – (EN dash), — (EM dash), >, →, ⇒
  // Erlaubt auch Kombinationen wie " - > " (->)
  const nameMsg =
    /^\s*([^:;；：,>\-\u2013\u2014\u2192\u21D2]+?)\s*(?:[:;；：,>\-\u2013\u2014\u2192\u21D2]+)\s*(.+)\s*$/u;

  const m = str.match(nameMsg);
  if (m) {
    const contact = (m[1] || "").trim();
    const msg = (m[2] || "").trim();
    return {
      contactName: contact === "" ? null : contact,
      content: msg,
    };
  }
  // Fallback: klassisches "Name: Nachricht"
  const fallback = /^\s*([^:]+):\s*(.+)\s*$/u;
  const m2 = str.match(fallback);
  if (m2) {
    const contact = (m2[1] || "").trim();
    const msg = (m2[2] || "").trim();
    return {
      contactName: contact === "" ? null : contact,
      content: msg,
    };
  }
  return { contactName: null, content: str };
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
// -------------------------------------------------

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

    // Map: ownerId(string) -> user info
    const ownerToUser = new Map<string, { id: string; nexoroId: string; nexoroDomain: string }>();
    for (const u of users) {
      ownerToUser.set(String(u._id), {
        id: String(u._id),
        nexoroId: u.nexoroUser!.trim(),
        nexoroDomain: u.nexoroDomain!.trim(),
      });
    }

    // 2) Notebooks dieser User
    const userIds: Types.ObjectId[] = users.map((u) => u._id);
    const notebooks = await Notebook.find(
      { ownerId: { $in: userIds } },
      { _id: 1, ownerId: 1 }
    ).lean<NotebookLean[]>();

    if (notebooks.length === 0) {
      return NextResponse.json({ response: "Success", data: {} });
    }

    // Maps
    const notebookIdToOwner = new Map<string, string>(); // nid -> ownerId
    const allNotebookIdsAsString = notebooks.map((n) => {
      const nid = String(n._id);
      notebookIdToOwner.set(nid, String(n.ownerId));
      return nid;
    });

    // 3) PagesContexts zu diesen Notebooks
    const contexts = await PagesContext.find(
      { notebookId: { $in: allNotebookIdsAsString } },
      { notebookId: 1, page: 1, imageUrl: 1, text: 1, wa: 1, cal: 1, todo: 1 }
    ).lean<ContextLean[]>();

    // 4) Struktur aufbauen:
    // data[notebookId] = { user: {...}, pages: { [pageId]: { image, actions[] } } }
    const data: Record<
      string,
      {
        user: { id: string; nexoroId: string; nexoroDomain: string };
        pages: Record<string, { image: string; actions: Action[] }>;
      }
    > = {};

    for (const c of contexts) {
      const nb = c.notebookId;
      const ownerId = notebookIdToOwner.get(nb);
      if (!ownerId) continue;

      const userInfo = ownerToUser.get(ownerId);
      if (!userInfo) continue; // sollte wegen Filter nicht passieren

      if (!data[nb]) {
        data[nb] = { user: userInfo, pages: {} };
      }

      const pageId = String(c.page);
      const image = c.imageUrl ?? "";
      if (!data[nb].pages[pageId]) {
        data[nb].pages[pageId] = { image, actions: [] };
      }

      // WA
      for (const s of c.wa ?? []) {
        const { contactName, content } = parseWA(s);
        data[nb].pages[pageId].actions.push({
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
        data[nb].pages[pageId].actions.push({
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
        data[nb].pages[pageId].actions.push({
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
