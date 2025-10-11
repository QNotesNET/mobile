// app/api/notebooks/claim/route.ts
import { NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import connectToDB from "@/lib/mongoose";
import { getSessionUserFromRequest } from "@/lib/auth";

export const runtime = "nodejs";

export async function POST(req: Request) {
  try {
    const { notebookId, claimToken } = await req.json();

    const session = await getSessionUserFromRequest(req);
    if (!session?.userId) {
      return NextResponse.json({ ok: false, error: "UNAUTHENTICATED" }, { status: 401 });
    }
    if (!notebookId && !claimToken) {
      return NextResponse.json({ ok: false, error: "MISSING_PARAMS" }, { status: 400 });
    }

    const mongoose = await connectToDB();
    const db = mongoose.connection.db;
    if (!db) throw new Error("MongoDB connection is not ready");
    const col = db.collection("notebooks");

    // Basisfilter
    const filter: Record<string, unknown> = { ownerId: { $exists: false } };

    // $or-Bedingungen robust aufbauen
    const ors: Array<Record<string, unknown>> = [];

    if (claimToken) {
      ors.push({ claimToken: String(claimToken) });
      const m = /^one-time-([0-9a-fA-F]{24})-/.exec(String(claimToken));
      if (m) {
        try {
          ors.push({ _id: new ObjectId(m[1]) });
        } catch {
          /* ignore */
        }
      }
    }

    if (notebookId) {
      try {
        ors.push({ _id: new ObjectId(String(notebookId)) });
      } catch {
        return NextResponse.json({ ok: false, error: "INVALID_NOTEBOOK_ID" }, { status: 400 });
      }
    }

    if (ors.length) (filter as Record<string, unknown>).$or = ors;

    const update = {
      $set: {
        ownerId: new ObjectId(String(session.userId)),
        claimedAt: new Date(),
      },
      $unset: { claimToken: "" },
    };

    const result = await col.updateOne(filter, update);

    const debug = {
      userId: session.userId,
      filterUsed: filter,
      matchedCount: result.matchedCount,
      modifiedCount: result.modifiedCount,
    };
    console.log("[claim-notebook]", debug);

    if (result.modifiedCount !== 1) {
      const reason = result.matchedCount === 0 ? "NOT_FOUND_OR_ALREADY_OWNED" : "NO_CHANGE";
      return NextResponse.json({ ok: false, error: reason, debug }, { status: 409 });
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[claim-notebook][ERROR]", err);
    return NextResponse.json({ ok: false, error: "SERVER_ERROR" }, { status: 500 });
  }
}
