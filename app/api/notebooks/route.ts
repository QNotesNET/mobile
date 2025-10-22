// app/api/notebooks/route.ts
import { NextResponse } from "next/server";
import { connectToDB } from "@/lib/mongoose";
import Notebook from "@/models/Notebook";
import { getCurrentUser } from "@/lib/session";
import { Types, PipelineStage } from "mongoose";
import type { ObjectId } from "mongodb";

type AggOut = {
  _id: ObjectId;
  title: string;
  createdAt?: Date;
  updatedAt?: Date;
  ownerId?: unknown;
  ownerIdStr?: string;
};

export async function GET() {
  await connectToDB();
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const uidStr = String(user.id);
  let uidObj: Types.ObjectId | null = null;
  try { uidObj = new Types.ObjectId(uidStr); } catch { uidObj = null; }

  const pipeline: PipelineStage[] = [
    { $addFields: { ownerIdStr: { $toString: "$ownerId" } } },
    {
      $match: {
        $or: [
          ...(uidObj ? [{ ownerId: uidObj }] : []),
          { ownerId: uidStr },
          { ownerIdStr: uidStr },
        ],
      },
    },
    { $sort: { createdAt: -1 } },
    { $project: { _id: 1, title: 1, createdAt: 1, updatedAt: 1 } },
  ];

  const docs = (await Notebook.aggregate(pipeline).exec()) as AggOut[];
  const items = docs.map((d) => ({
    id: String(d._id),
    title: d.title,
    createdAt: d.createdAt,
    updatedAt: d.updatedAt,
  }));

  return NextResponse.json({ items });
}

// ...oberer Teil unverändert...

// app/api/notebooks/route.ts
// ...imports unverändert...

export async function POST(req: Request) {
  await connectToDB();
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const url = new URL(req.url);
  const noOwnerFromQuery = url.searchParams.get("noOwner") === "1" || url.searchParams.get("noOwner") === "true";

  const body = (await req.json().catch(() => ({}))) as {
    title?: unknown;
    noOwner?: unknown;
    pages?: unknown; // ⬅️ neu
  };

  const title = typeof body.title === "string" ? body.title.trim() : "";
  const noOwnerFromBody =
    body?.noOwner === true || body?.noOwner === "1" || body?.noOwner === "true";
  const createWithoutOwner = Boolean(noOwnerFromQuery || noOwnerFromBody);

  // Seitenanzahl robust lesen (0 = keine Seitenerstellung)
  let pages =
    typeof body.pages === "number"
      ? Math.floor(body.pages)
      : typeof body.pages === "string"
      ? Math.floor(Number(body.pages))
      : 0;
  if (!Number.isFinite(pages) || pages < 0) pages = 0;
  if (pages > 2000) pages = 2000;

  if (!title) {
    return NextResponse.json({ error: "Missing title" }, { status: 400 });
  }

  const doc: { title: string; ownerId?: unknown } = { title };
  if (!createWithoutOwner) {
    const uidStr = String(user.id);
    let ownerId: unknown = uidStr;
    try { ownerId = new Types.ObjectId(uidStr); } catch {}
    doc.ownerId = ownerId;
  }

  // 1) Notebook anlegen
  const nb = await Notebook.create(doc);

  // Mit Owner: sofort zurück (ohne Seiten & QR)
  if (!createWithoutOwner) {
    return NextResponse.json(
      { item: { id: String(nb._id), title: nb.title } },
      { status: 201 }
    );
  }

  // Für ownerlose Books: Seiten batchen + QR erzeugen
  const proto = req.headers.get("x-forwarded-proto") || "http";
  const host  = req.headers.get("x-forwarded-host") || req.headers.get("host");
  const origin = host ? `${proto}://${host}` : new URL(req.url).origin;
  const cookie = req.headers.get("cookie") ?? "";

  // 2) Seiten erzeugen (falls pages > 0)
  if (pages > 0) {
    try {
      const pgRes = await fetch(
        `${origin}/api/notebooks/${encodeURIComponent(String(nb._id))}/pages/batch?internal=1`, // ⬅️ Flag
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            accept: "application/json",
            cookie,                // Session mitgeben (falls nötig)
            "x-internal": "1",     // ⬅️ zusätzliches internes Signal
          },
          body: JSON.stringify({ from: 1, to: pages }),
          cache: "no-store",
        }
      );
      if (!pgRes.ok) {
        const peek = await pgRes.text().catch(() => "");
        console.error("[POST /api/notebooks] pages/batch failed:", pgRes.status, peek.slice(0, 200));
      }
    } catch (e) {
      console.error("[POST /api/notebooks] pages/batch error:", e);
    }
  }

  // 3) QR-Code erzeugen
  let qr: { token?: string; url?: string } | null = null;
  try {
    const qrRes = await fetch(
      `${origin}/api/qr/single?notebookId=${encodeURIComponent(String(nb._id))}`,
      {
        method: "GET",
        headers: { cookie, accept: "application/json" },
        cache: "no-store",
      }
    );
    const ct = qrRes.headers.get("content-type") || "";
    if (qrRes.ok && ct.includes("application/json")) {
      qr = (await qrRes.json()) as { token?: string; url?: string };
    } else {
      const peek = await qrRes.text().catch(() => "");
      console.error("[POST /api/notebooks] QR non-JSON:", qrRes.status, ct, peek.slice(0, 200));
    }
  } catch (e) {
    console.error("[POST /api/notebooks] QR call error:", e);
  }

  return NextResponse.json(
    { item: { id: String(nb._id), title: nb.title }, qr },
    { status: 201 }
  );
}
