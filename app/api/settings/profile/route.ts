import { NextResponse } from "next/server";
import { Types } from "mongoose";
import connectToDB from "@/lib/mongoose";
import User from "@/models/User";
import { getCurrentUser } from "@/lib/session";

export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user?.id) return NextResponse.json({}, { status: 200 }); // leer zurück
    await connectToDB();

    const u = await User.findById(new Types.ObjectId(user.id)).lean();
    return NextResponse.json({
      firstName: u?.firstName ?? "",
      lastName: u?.lastName ?? "",
    });
  } catch (e) {
    return new NextResponse("Failed to load profile", { status: 500 });
  }
}

export async function PUT(req: Request) {
  try {
    const me = await getCurrentUser();
    if (!me?.id) return new NextResponse("Unauthorized", { status: 401 });

    const { firstName = "", lastName = "" } = await req.json();

    await connectToDB();
    await User.findByIdAndUpdate(
      new Types.ObjectId(me.id),
      { firstName: String(firstName).trim(), lastName: String(lastName).trim() },
      { new: false },
    );

    return NextResponse.json({ ok: true });
  } catch (e) {
    return new NextResponse("Failed to update profile", { status: 500 });
  }
}
