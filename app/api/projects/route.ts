// app/api/projects/route.ts
import { NextResponse } from "next/server";
import { Types } from "mongoose";
import connectToDB from "@/lib/mongoose";
import { getCurrentUser } from "@/lib/session";
import Project from "@/models/Project";

export async function GET() {
  try {
    const me = await getCurrentUser();
    if (!me?.id) return new NextResponse("Unauthorized", { status: 401 });

    await connectToDB();
    const ownerId = new Types.ObjectId(me.id);

    const items = await Project.find({ ownerId })
      .sort({ updatedAt: -1 })
      .select({ title: 1 }) // leichtgewichtig
      .lean();

    return NextResponse.json(
      items.map((p) => ({ id: String(p._id), title: p.title })),
      { status: 200 }
    );
  } catch {
    return new NextResponse("Failed to load projects", { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const me = await getCurrentUser();
    if (!me?.id) return new NextResponse("Unauthorized", { status: 401 });

    const body = await req.json();
    const rawTitle = String(body?.title ?? "").trim();
    if (!rawTitle) return new NextResponse("Title required", { status: 400 });

    await connectToDB();
    const doc = await Project.create({
      title: rawTitle,
      ownerId: new Types.ObjectId(me.id),
    });

    return NextResponse.json({ id: String(doc._id), title: doc.title }, { status: 201 });
  } catch {
    return new NextResponse("Failed to create project", { status: 500 });
  }
}
