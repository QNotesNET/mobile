// app/api/auth/reset/route.ts
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { connectToDB } from "@/lib/mongoose";
import User from "@/models/User";
import { hashPassword } from "@/lib/password";

type Body = { token?: string; password?: string };

export async function POST(req: Request) {
  try {
    await connectToDB();

    const body = (await req.json().catch(() => ({} as Body))) ?? {};
    const token = String(body.token || "");
    const password = String(body.password || "");

    if (!token || !password) {
      return NextResponse.json({ error: "Missing token or password" }, { status: 400 });
    }
    if (password.length < 8) {
      return NextResponse.json({ error: "Passwort zu kurz (min. 8 Zeichen)" }, { status: 400 });
    }

    const now = new Date();
    const user = await User.findOne({
      resetToken: token,
      resetTokenExpiresAt: { $gt: now },
    }).exec();

    if (!user) {
      return NextResponse.json({ error: "Token ungültig oder abgelaufen" }, { status: 400 });
    }

    user.passwordHash = await hashPassword(password);
    user.resetToken = null;
    user.resetTokenExpiresAt = null;
    await user.save();

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("reset route error:", err);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
