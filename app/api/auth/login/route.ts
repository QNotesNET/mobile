export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { connectToDB } from "@/lib/mongoose";
import User from "@/models/User";
import bcrypt from "bcryptjs";
import { createSessionJWT, cookieOptions, publicUser } from "@/lib/auth";

export async function POST(req: Request) {
  await connectToDB();
  const { email, password } = await req.json().catch(() => ({}));

  if (!email || !password) {
    return NextResponse.json({ error: "E-Mail und Passwort sind erforderlich." }, { status: 400 });
  }

  const normEmail = String(email).trim().toLowerCase();
  const user = await User.findOne({ email: normEmail });
  if (!user) return NextResponse.json({ error: "Ungültige Zugangsdaten." }, { status: 401 });

  const ok = await bcrypt.compare(password, user.passwordHash);
  if (!ok) return NextResponse.json({ error: "Ungültige Zugangsdaten." }, { status: 401 });

  const token = await createSessionJWT({ sub: String(user._id), email: user.email, role: user.role });
  const res = NextResponse.json({ user: publicUser(user) }, { status: 200 });
  res.cookies.set("qnotes_session", token, cookieOptions());
  return res;
}
