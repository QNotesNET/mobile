export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { connectToDB } from "@/lib/mongoose";
import User from "@/models/User";
import bcrypt from "bcryptjs";
import { createSessionJWT, cookieOptions, publicUser } from "@/lib/auth";

export async function POST(req: Request) {
  await connectToDB();
  const { email, password, firstName, lastName } = await req.json().catch(() => ({}));

  if (!email || !password) {
    return NextResponse.json({ error: "E-Mail und Passwort sind erforderlich." }, { status: 400 });
  }
  const normEmail = String(email).trim().toLowerCase();
  if (password.length < 8) {
    return NextResponse.json({ error: "Passwort muss mind. 8 Zeichen haben." }, { status: 400 });
  }

  const existing = await User.findOne({ email: normEmail }).lean();
  if (existing) {
    return NextResponse.json({ error: "E-Mail bereits registriert." }, { status: 409 });
  }

  const passwordHash = await bcrypt.hash(password, 12);
  const fullName = [firstName, lastName].filter(Boolean).join(" ") || undefined;

  const user = await User.create({
    email: normEmail,
    passwordHash,
    firstName: firstName ? String(firstName).trim() : undefined,
    lastName: lastName ? String(lastName).trim() : undefined,
    name: fullName,
  });

  const token = await createSessionJWT({ sub: String(user._id), email: user.email, role: user.role });
  const res = NextResponse.json({ user: publicUser(user) }, { status: 201 });
  res.cookies.set("qnotes_session", token, cookieOptions());
  return res;
}
