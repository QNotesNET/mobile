// app/api/push/register/route.ts
import { NextRequest, NextResponse } from "next/server";
import User from "@/models/User";
import { getSessionUserFromRequest } from "@/lib/auth";

export async function POST(req: NextRequest) {
  try {
    // 1️⃣ Session-User ermitteln
    const session = await getSessionUserFromRequest(req);

    // 2️⃣ Body lesen
    const data = await req.json();
    const expoPushToken = data.expoPushToken || data.token;
    const email = data.email || null;

    if (!expoPushToken) {
      return NextResponse.json({ error: "Missing token" }, { status: 400 });
    }

    // 3️⃣ User ermitteln
    let user = null;
    if (session?.userId) {
      user = await User.findById(session.userId);
    } else if (email) {
      user = await User.findOne({ email });
    }

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // 4️⃣ User updaten
    user.expoPushToken = expoPushToken;
    await user.save();

    console.log(
      `[ExpoPushRegister] ${user.email} -> ${expoPushToken.slice(0, 20)}...`
    );

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[PushRegister]", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
