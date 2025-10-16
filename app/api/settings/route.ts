// app/api/settings/route.ts
import { NextResponse } from "next/server";
import connectToDB from "@/lib/mongoose";
import Setting from "@/models/Settings";
import { getCurrentUser } from "@/lib/session";

export const dynamic = "force-dynamic";

function defaults() {
  return {
    key: "global",
    vision: {
      model: "gpt-4o-mini",         // <– passe gerne an
      resolution: "low",
      prompt:
        "Analysiere das Foto einer handschriftlichen Notizseite. Extrahiere Inhalte strukturiert und robust gegen Artefakte.",
    },
    pageDetect: {
      model: "gpt-4o-mini",
      resolution: "low",
      prompt:
        "Bestimme ausschließlich die erkannte Seitennummer als ganze Zahl. Wenn keine Nummer erkennbar ist, gib -1 zurück.",
    },
  };
}

/** GET /api/settings – nur Admin (UI) */
export async function GET() {
  const me = await getCurrentUser();
  if (!me || me.role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  await connectToDB();

  let doc = await Setting.findOne({ key: "global" }).lean();
  if (!doc) {
    // initial anlegen
    const created = await Setting.create(defaults());
    doc = created.toObject();
  }

  return NextResponse.json(
    {
      key: doc.key,
      vision: doc.vision ?? defaults().vision,
      pageDetect: doc.pageDetect ?? defaults().pageDetect,
      updatedAt: doc.updatedAt ?? null,
    },
    { status: 200 }
  );
}

/** PATCH /api/settings – Admin-Update */
export async function PATCH(req: Request) {
  const me = await getCurrentUser();
  if (!me || me.role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = (await req.json().catch(() => ({}))) as Partial<{
    vision: Partial<{ model: string; resolution: string; prompt: string }>;
    pageDetect: Partial<{ model: string; resolution: string; prompt: string }>;
  }>;

  await connectToDB();

  const $set: Record<string, unknown> = {};
  if (body.vision) {
    if (typeof body.vision.model === "string") $set["vision.model"] = body.vision.model.trim();
    if (typeof body.vision.resolution === "string") $set["vision.resolution"] = body.vision.resolution.trim();
    if (typeof body.vision.prompt === "string") $set["vision.prompt"] = body.vision.prompt;
  }
  if (body.pageDetect) {
    if (typeof body.pageDetect.model === "string") $set["pageDetect.model"] = body.pageDetect.model.trim();
    if (typeof body.pageDetect.resolution === "string") $set["pageDetect.resolution"] = body.pageDetect.resolution.trim();
    if (typeof body.pageDetect.prompt === "string") $set["pageDetect.prompt"] = body.pageDetect.prompt;
  }

  const doc = await Setting.findOneAndUpdate(
    { key: "global" },
    Object.keys($set).length ? { $set } : {},
    { new: true, upsert: true }
  ).lean();

  return NextResponse.json(
    {
      key: doc?.key ?? "global",
      vision: doc?.vision,
      pageDetect: doc?.pageDetect,
      updatedAt: doc?.updatedAt ?? null,
    },
    { status: 200 }
  );
}
