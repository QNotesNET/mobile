// app/api/admin/notebooks/route.ts
import { NextResponse } from "next/server";
import connectToDB from "@/lib/mongoose";
import Notebook from "@/models/Notebook";
import Page from "@/models/PageModel";
import User from "@/models/User";
import { getCurrentUser } from "@/lib/session";
import { Types } from "mongoose";

export const dynamic = "force-dynamic";

type LeanNotebook = {
  _id: Types.ObjectId;
  title: string;
  ownerId: Types.ObjectId;
  createdAt?: Date;
};

export async function GET() {
  try {
    const me = await getCurrentUser();
    if (!me || me.role !== "admin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await connectToDB();

    const nbs = await Notebook.find(
      {},
      { title: 1, ownerId: 1, createdAt: 1 }
    )
      .sort({ createdAt: -1 })
      .lean<LeanNotebook[]>();

    if (!nbs || nbs.length === 0) {
      return NextResponse.json([], { status: 200 });
    }

    const nbIds = nbs.map((n) => n._id);
    const ownerIds = Array.from(new Set(nbs.map((n) => String(n.ownerId)))).map((id) => new Types.ObjectId(id));

    // Seiten-Stats aggregieren
    const pageStats = await Page.aggregate([
      { $match: { notebookId: { $in: nbIds } } },
      {
        $project: {
          notebookId: 1,
          hasImage: { $gt: [{ $size: { $ifNull: ["$images", []] } }, 0] },
        },
      },
      {
        $group: {
          _id: "$notebookId",
          totalPages: { $sum: 1 },
          scannedPages: { $sum: { $cond: ["$hasImage", 1, 0] } },
        },
      },
    ]);

    const statsMap = new Map<
      string,
      { totalPages: number; scannedPages: number }
    >();
    for (const s of pageStats) {
      statsMap.set(String(s._id), {
        totalPages: Number(s.totalPages ?? 0),
        scannedPages: Number(s.scannedPages ?? 0),
      });
    }

    // Owner E-Mails laden
    const owners = await User.find(
      { _id: { $in: ownerIds } },
      { email: 1 }
    ).lean<{ _id: Types.ObjectId; email: string }[]>();
    const ownerMap = new Map<string, string>();
    for (const o of owners) {
      ownerMap.set(String(o._id), o.email);
    }

    const result = nbs.map((n) => {
      const s = statsMap.get(String(n._id)) ?? { totalPages: 0, scannedPages: 0 };
      return {
        _id: String(n._id),
        title: n.title,
        ownerId: String(n.ownerId),
        ownerEmail: ownerMap.get(String(n.ownerId)) ?? "—",
        totalPages: s.totalPages,
        scannedPages: s.scannedPages,
        createdAt: n.createdAt ?? null,
      };
    });

    return NextResponse.json(result, { status: 200 });
  } catch (err) {
    console.error("[API] GET /api/admin/notebooks failed:", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
