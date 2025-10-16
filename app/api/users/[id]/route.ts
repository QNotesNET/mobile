// app/api/users/[id]/route.ts
import { NextResponse } from "next/server";
import connectToDB from "@/lib/mongoose";
import User from "@/models/User";
import { getCurrentUser } from "@/lib/session";
import { Types } from "mongoose";

export const dynamic = "force-dynamic";

type LeanUser = {
  _id: Types.ObjectId;
  email: string;
  firstName?: string;
  lastName?: string;
  role?: string;
  createdAt?: Date;
};

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }  // 👈 params als Promise
) {
  try {
    const me = await getCurrentUser();
    if (!me || me.role !== "admin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;                   // 👈 auflösen
    if (!Types.ObjectId.isValid(id)) {
      return NextResponse.json({ error: "Invalid id" }, { status: 400 });
    }

    const body = await req.json().catch(() => ({}));
    const update: Record<string, unknown> = {};
    if (typeof body.firstName === "string") update.firstName = body.firstName.trim();
    if (typeof body.lastName === "string") update.lastName = body.lastName.trim();
    if (body.role === "admin" || body.role === "user") update.role = body.role;

    await connectToDB();

    const doc = await User.findByIdAndUpdate(id, update, { new: true })
      .lean<LeanUser | null>();

    if (!doc) return NextResponse.json({ error: "Not found" }, { status: 404 });

    return NextResponse.json(
      {
        _id: String(doc._id),
        email: doc.email,
        firstName: doc.firstName ?? "",
        lastName: doc.lastName ?? "",
        role: doc.role ?? "user",
        createdAt: doc.createdAt ?? null,
      },
      { status: 200 }
    );
  } catch (err) {
    console.error("[API] PATCH /api/users/[id] failed:", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }  // 👈 params als Promise
) {
  try {
    const me = await getCurrentUser();
    if (!me || me.role !== "admin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;                   // 👈 auflösen
    if (!Types.ObjectId.isValid(id)) {
      return NextResponse.json({ error: "Invalid id" }, { status: 400 });
    }

    await connectToDB();
    const res = await User.findByIdAndDelete(id).lean<LeanUser | null>();
    if (!res) return NextResponse.json({ error: "Not found" }, { status: 404 });

    return NextResponse.json({ ok: true }, { status: 200 });
  } catch (err) {
    console.error("[API] DELETE /api/users/[id] failed:", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
