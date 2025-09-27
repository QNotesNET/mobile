// app/api/auth/reset/route.ts
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { connectToDB } from "@/lib/mongoose";
import User from "@/models/User";
import bcrypt from "bcryptjs";
import { cookieOptions, createSessionJWT, publicUser } from "@/lib/auth";

type Body = {
  token?: string;
  password?: string;
};

export async function POST(req: Request) {
  try {
    await connectToDB();

    const body = (await req.json().catch(() => ({} as Body))) ?? {};
    const token = String(body.token || "").trim();
    const password = String(body.password || "");

    if (!token || !password) {
      return NextResponse.json({ error: "Missing token or password" }, { status: 400 });
    }
    if (password.length < 8) {
      return NextResponse.json({ error: "Password too short" }, { status: 400 });
    }

    // Find user by reset token (still valid)
    const now = new Date();
    const user = await User.findOne({
      resetToken: token,
      resetTokenExpiresAt: { $gt: now },
    });

    if (!user) {
      return NextResponse.json({ error: "Invalid or expired token" }, { status: 400 });
    }

    // Update password & clear reset fields
    const hash = await bcrypt.hash(password, 12);
    user.passwordHash = hash;
    user.resetToken = null;
    user.resetTokenExpiresAt = null;
    await user.save();

    // Optional: log them in right away
    const jwt = await createSessionJWT({ sub: String(user._id), email: user.email, role: user.role });
    const res = NextResponse.json({ ok: true, user: publicUser({
      _id: user._id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      role: user.role,
    }) });

    res.cookies.set("qnotes_session", jwt, cookieOptions());
    return res;
  } catch (err) {
    console.error("reset route error:", err);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
