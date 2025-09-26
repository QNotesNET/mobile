// app/api/auth/login/route.ts
export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { connectToDB } from "@/lib/mongoose";
import User from "@/models/User";
import { compare } from "bcryptjs";
import { createSessionJWT, cookieOptions, publicUser } from "@/lib/auth";
import { Types } from "mongoose";

type LoginUserLean = {
  _id: Types.ObjectId;
  email: string;
  firstName?: string;
  lastName?: string;
  role?: string;
  passwordHash: string;
};

export async function POST(req: Request) {
  await connectToDB();

  const body = await req.json().catch(() => ({} as Partial<{ email: string; password: string }>));
  const email = (body.email || "").trim().toLowerCase();
  const password = String(body.password || "");

  if (!email || !password) {
    return NextResponse.json({ error: "E-Mail und Passwort erforderlich" }, { status: 400 });
  }

  const user = await User.findOne({ email })
    .select({ passwordHash: 1, email: 1, firstName: 1, lastName: 1, role: 1 })
    .lean<LoginUserLean | null>();

  if (!user || !user.passwordHash) {
    return NextResponse.json({ error: "Ungültige Anmeldedaten" }, { status: 401 });
  }

  const ok = await compare(password, user.passwordHash);
  if (!ok) {
    return NextResponse.json({ error: "Ungültige Anmeldedaten" }, { status: 401 });
  }

  const token = await createSessionJWT({
    sub: String(user._id),
    email: user.email,
    role: user.role,
  });

  const name = [user.firstName, user.lastName].filter(Boolean).join(" ");

  const safeUser = publicUser({
    _id: user._id,
    email: user.email,
    firstName: user.firstName,
    lastName: user.lastName,
    name,
    role: user.role,
  });

  const res = NextResponse.json({ user: safeUser }, { status: 200 });
  res.cookies.set("qnotes_session", token, cookieOptions());
  return res;
}
