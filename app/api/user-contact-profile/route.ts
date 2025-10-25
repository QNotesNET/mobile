import { NextResponse } from "next/server";
import connectToDB from "@/lib/mongoose";
import UserContactProfile from "@/models/UserContactProfile";
import { getCurrentUser } from "@/lib/session";

export async function GET() {
  await connectToDB();
  const user = await getCurrentUser();
  if (!user)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const profile = await UserContactProfile.findOne({ userId: user.id });
  return NextResponse.json({ profile });
}

export async function POST(req: Request) {
  await connectToDB();
  const user = await getCurrentUser();
  if (!user)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  // @ts-expect-error ---
  const avatarUrl = body.avatarUrl || user.image || "";

  const updateData = {
    avatarUrl,
    firstName: body.firstName ?? "",
    lastName: body.lastName ?? "",
    company: body.company ?? "",
    position: body.position ?? "",
    email: body.email ?? "",
    phone: body.phone ?? "",
    street: body.street ?? "",
    postalCode: body.postalCode ?? "",
    city: body.city ?? "",
    country: body.country ?? "",
  };

  const profile = await UserContactProfile.findOneAndUpdate(
    { userId: user.id },
    { $set: { ...updateData, userId: user.id } },
    { new: true, upsert: true }
  );

  return NextResponse.json({ profile });
}
