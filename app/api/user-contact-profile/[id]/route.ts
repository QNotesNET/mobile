import { NextResponse } from "next/server";
import connectToDB from "@/lib/mongoose";
import UserContactProfile from "@/models/UserContactProfile";

export const runtime = "nodejs";

// === Öffentliches Profil abrufen ===
export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  await connectToDB();

  const profile = await UserContactProfile.findOne({ userId: id }).lean();
  if (!profile)
    return NextResponse.json(
      { error: "Profil nicht gefunden" },
      { status: 404 }
    );

  return NextResponse.json({ profile });
}
