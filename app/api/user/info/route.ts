import { NextResponse } from "next/server";
import connectToDB from "@/lib/mongoose";
import User from "@/models/User";
import { getCurrentUser } from "@/lib/session";

export async function GET() {
  await connectToDB();
  const session = await getCurrentUser();
  if (!session?.id) return NextResponse.json({ user: null }, { status: 401 });

  const user = await User.findById(session.id)
    .select("firstName lastName email role")
    .lean();

  return NextResponse.json({ user });
}
