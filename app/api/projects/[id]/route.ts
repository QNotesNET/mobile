// app/api/projects/[id]/route.ts
import { NextResponse } from "next/server";
import { Types } from "mongoose";
import connectToDB from "@/lib/mongoose";
import { getCurrentUser } from "@/lib/session";
import Project from "@/models/Project";

function ensureObjectId(id: string | string[]): Types.ObjectId | null {
  try {
    const s = Array.isArray(id) ? id[0] : id;
    return new Types.ObjectId(s);
  } catch {
    return null;
  }
}

const ALLOWED_STATUS = new Set(["open", "in_progress", "done"]);

export async function GET(
  _req: Request,
  ctx: { params: Promise<{ id: string }> }   // 👈 Next 15: params ist Promise
) {
  try {
    const me = await getCurrentUser();
    if (!me?.id) return new NextResponse("Unauthorized", { status: 401 });

    const { id } = await ctx.params;         // 👈 aus Promise auspacken
    const pid = ensureObjectId(id);
    if (!pid) return new NextResponse("Invalid id", { status: 400 });

    await connectToDB();

    const project = await Project.findOne({
      _id: pid,
      ownerId: new Types.ObjectId(me.id),
    })
      .select({ title: 1, description: 1, status: 1, createdAt: 1, updatedAt: 1 })
      .lean();

    if (!project) return new NextResponse("Not found", { status: 404 });

    return NextResponse.json({
      id: String(project._id),
      title: project.title,
      description: project.description ?? "",
      status: project.status ?? "open",
      createdAt: project.createdAt,
      updatedAt: project.updatedAt,
    });
  } catch {
    return new NextResponse("Failed to load project", { status: 500 });
  }
}

export async function PATCH(
  req: Request,
  ctx: { params: Promise<{ id: string }> }   // 👈 Promise
) {
  try {
    const me = await getCurrentUser();
    if (!me?.id) return new NextResponse("Unauthorized", { status: 401 });

    const { id } = await ctx.params;         // 👈 aus Promise auspacken
    const pid = ensureObjectId(id);
    if (!pid) return new NextResponse("Invalid id", { status: 400 });

    const body = await req.json();

    const updates: Partial<{ title: string; description: string; status: string }> = {};

    if (typeof body?.title === "string") {
      const t = body.title.trim();
      if (!t) return new NextResponse("Title required", { status: 400 });
      updates.title = t;
    }
    if (typeof body?.description === "string") {
      updates.description = String(body.description);
    }
    if (typeof body?.status === "string") {
      const cleaned = body.status.trim();
      if (!ALLOWED_STATUS.has(cleaned)) {
        return new NextResponse("Invalid status", { status: 400 });
      }
      updates.status = cleaned;
    }

    await connectToDB();
    const ownerId = new Types.ObjectId(me.id);

    const updated = await Project.findOneAndUpdate(
      { _id: pid, ownerId },
      { $set: updates },
      { new: true }
    )
      .select({ title: 1, description: 1, status: 1, createdAt: 1, updatedAt: 1 })
      .lean();

    if (!updated) return new NextResponse("Not found", { status: 404 });

    return NextResponse.json({
      id: String(updated._id),
      title: updated.title,
      description: updated.description ?? "",
      status: updated.status ?? "open",
      createdAt: updated.createdAt,
      updatedAt: updated.updatedAt,
    });
  } catch {
    return new NextResponse("Failed to update project", { status: 500 });
  }
}

export async function DELETE(
  _req: Request,
  ctx: { params: Promise<{ id: string }> }   // 👈 Promise
) {
  try {
    const me = await getCurrentUser();
    if (!me?.id) return new NextResponse("Unauthorized", { status: 401 });

    const { id } = await ctx.params;         // 👈 aus Promise auspacken
    const pid = ensureObjectId(id);
    if (!pid) return new NextResponse("Invalid id", { status: 400 });

    await connectToDB();
    const ownerId = new Types.ObjectId(me.id);

    const res = await Project.deleteOne({ _id: pid, ownerId });
    if (res.deletedCount === 0) return new NextResponse("Not found", { status: 404 });

    return NextResponse.json({ ok: true }, { status: 200 });
  } catch {
    return new NextResponse("Failed to delete project", { status: 500 });
  }
}
