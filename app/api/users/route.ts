// app/api/users/route.ts
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

export async function GET() {
  try {
    const me = await getCurrentUser();
    if (!me || me.role !== "admin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await connectToDB();

    const docs = await User.find(
      {},
      { email: 1, firstName: 1, lastName: 1, role: 1, createdAt: 1 }
    )
      .sort({ createdAt: -1 })
      .lean<LeanUser[]>();

    const users = (docs ?? []).map((u) => ({
      _id: String(u._id),
      email: u.email,
      firstName: u.firstName ?? "",
      lastName: u.lastName ?? "",
      role: u.role ?? "user",
      createdAt: u.createdAt ?? null,
    }));

    return NextResponse.json(users, { status: 200 });
  } catch (err) {
    console.error("[API] GET /api/users failed:", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
