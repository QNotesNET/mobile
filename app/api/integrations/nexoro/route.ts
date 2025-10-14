import { NextResponse } from "next/server";
import { connectToDB } from "@/lib/mongoose";
import User from "@/models/User";
import Notebook from "@/models/Notebook";
import PagesContext from "@/models/PagesContext";

export const runtime = "nodejs";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const domain = (searchParams.get("nexoroDomain") || "").trim();
    if (!domain) {
      return NextResponse.json({ error: "Missing nexoroDomain" }, { status: 400 });
    }

    await connectToDB();

    // 1) Kandidaten holen (leicht großzügig) …
    const usersRaw = await User.find(
      { nexoroDomain: domain }, // Vorfilter auf Domain
      { _id: 1, nexoroUser: 1, nexoroDomain: 1 }
    ).lean();

    // … und DANN HART filtern (nix leer, nix undefined)
    const users = usersRaw.filter(
      (u: any) =>
        typeof u?.nexoroUser === "string" &&
        u.nexoroUser.trim() !== "" &&
        typeof u?.nexoroDomain === "string" &&
        u.nexoroDomain.trim() === domain
    );

    if (!users.length) {
      return NextResponse.json({ results: [] });
    }

    const userIds = users.map((u: any) => String(u._id));

    // 2) Notebooks der gefilterten User
    const notebooks = await Notebook.find(
      { ownerId: { $in: userIds } },
      { _id: 1, ownerId: 1 }
    ).lean();

    const notebookIdToOwner = new Map<string, string>();
    const allNotebookIdsAsString: string[] = [];
    for (const n of notebooks) {
      const nid = String(n._id);
      notebookIdToOwner.set(nid, String(n.ownerId));
      allNotebookIdsAsString.push(nid);
    }

    // 3) Passende PagesContexts
    const contexts = allNotebookIdsAsString.length
      ? await PagesContext.find(
          { notebookId: { $in: allNotebookIdsAsString } },
          { notebookId: 1, page: 1, imageUrl: 1, text: 1, wa: 1, cal: 1, todo: 1 }
        ).lean()
      : [];

    // 4) Response pro User (nur die gefilterten!)
    const results = users.map((u: any) => {
      const ownerIdStr = String(u._id);
      const myContexts = contexts
        .filter((c: any) => notebookIdToOwner.get(c.notebookId) === ownerIdStr)
        .map((c: any) => ({
          notebookId: c.notebookId,
          page: c.page,
          imageUrl: c.imageUrl || "",
          text: c.text || "",
          wa: Array.isArray(c.wa) ? c.wa : [],
          cal: Array.isArray(c.cal) ? c.cal : [],
          todo: Array.isArray(c.todo) ? c.todo : [],
        }));

      return {
        nexoroId: u.nexoroUser,        // garantiert non-empty durch Filter
        nexoroDomain: u.nexoroDomain,  // exakt == domain
        contexts: myContexts,
      };
    });

    return NextResponse.json({ results });
  } catch (err: any) {
    console.error("[GET /api/integrations/nexoro] error:", err);
    return NextResponse.json({ error: err?.message || "Server error" }, { status: 500 });
  }
}
