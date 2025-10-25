/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextResponse } from "next/server";
import connectToDB from "@/lib/mongoose";
import UserContactProfile from "@/models/UserContactProfile";

export async function GET(req: Request, context: any) {
  await connectToDB();

  const id = context?.params?.id;
  if (!id) {
    return NextResponse.json({ error: "Missing ID" }, { status: 400 });
  }

  try {
    // Profil anhand der userId finden
    const profile = await UserContactProfile.findOne({ userId: id });

    if (!profile) {
      return NextResponse.json({ error: "Profile not found" }, { status: 404 });
    }

    return NextResponse.json({ profile });
  } catch (error) {
    console.error("Error loading contact:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}
