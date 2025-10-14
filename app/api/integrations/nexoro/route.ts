import { NextResponse } from "next/server";
import { connectToDB } from "@/lib/mongoose";
import User from "@/models/User";
import Notebook from "@/models/Notebook";
import PagesContext from "@/models/PagesContext";
import { Types } from "mongoose";

export const runtime = "nodejs";

// ----- Lean-Typen für Queries -----
type UserLean = {
  _id: Types.ObjectId;
  nexoroUser?: string;
  nexoroDomain?: string;
};

type NotebookLean = {
  _id: Types.ObjectId;
  ownerId: Types.ObjectId;
};

type ContextLean = {
  notebookId: string;            // als String gespeichert
  page: Types.ObjectId;          // Ref auf Page
  imageUrl?: string;
  text?: string;
  wa?: string[];
  cal?: string[];
  todo?: string[];
};

type ResultItem = {
  notebookId: string;
  page: Types.ObjectId;
  imageUrl: string;
  text: string;
  wa: string[];
  cal: string[];
  todo: string[];
};

type ResultPerUser = {
  nexoroId: string;
  nexoroDomain: string;
  contexts: ResultItem[];
};

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const domain = (searchParams.get("nexoroDomain") || "").trim();
    if (!domain) {
      return NextResponse.json({ error: "Missing nexoroDomain" }, { status: 400 });
    }

    await connectToDB();

    // 1) User mit Domain holen (grober Filter) …
    const usersRaw = await User.find(
      { nexoroDomain: domain },
      { _id: 1, nexoroUser: 1, nexoroDomain: 1 }
    ).lean<UserLean[]>();

    // … und streng filtern (non-empty nexoroUser, exakte Domain)
    const users: UserLean[] = usersRaw.filter(
      (u) =>
        typeof u?.nexoroUser === "string" &&
        u.nexoroUser.trim() !== "" &&
        typeof u?.nexoroDomain === "string" &&
        u.nexoroDomain.trim() === domain
    );

    if (users.length === 0) {
      return NextResponse.json({ results: [] as ResultPerUser[] });
    }

    const userIds: Types.ObjectId[] = users.map((u) => u._id);

    // 2) Notebooks der gefilterten User
    const notebooks = await Notebook.find(
      { ownerId: { $in: userIds } },
      { _id: 1, ownerId: 1 }
    ).lean<NotebookLean[]>();

    // Map notebookId(string) -> ownerId(string)
    const notebookIdToOwner = new Map<string, string>();
    const allNotebookIdsAsString: string[] = [];
    for (const n of notebooks) {
      const nid = String(n._id);
      notebookIdToOwner.set(nid, String(n.ownerId));
      allNotebookIdsAsString.push(nid);
    }

    // 3) Passende PagesContexts
    const contexts: ContextLean[] = allNotebookIdsAsString.length
      ? await PagesContext.find(
          { notebookId: { $in: allNotebookIdsAsString } },
          { notebookId: 1, page: 1, imageUrl: 1, text: 1, wa: 1, cal: 1, todo: 1 }
        ).lean<ContextLean[]>()
      : [];

    // 4) Response pro User
    const results: ResultPerUser[] = users.map((u) => {
      const ownerIdStr = String(u._id);

      const myContexts: ResultItem[] = contexts
        .filter((c) => notebookIdToOwner.get(c.notebookId) === ownerIdStr)
        .map((c) => ({
          notebookId: c.notebookId,
          page: c.page,
          imageUrl: c.imageUrl ?? "",
          text: c.text ?? "",
          wa: Array.isArray(c.wa) ? c.wa : [],
          cal: Array.isArray(c.cal) ? c.cal : [],
          todo: Array.isArray(c.todo) ? c.todo : [],
        }));

      return {
        nexoroId: u.nexoroUser!.trim(),
        nexoroDomain: u.nexoroDomain!.trim(),
        contexts: myContexts,
      };
    });

    return NextResponse.json({ results });
  } catch (err: unknown) {
    const message =
      err instanceof Error ? err.message : "Server error";
    console.error("[GET /api/integrations/nexoro] error:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
