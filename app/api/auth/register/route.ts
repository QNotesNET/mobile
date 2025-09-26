// app/api/auth/register/route.ts
export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { connectToDB } from "@/lib/mongoose";
import User from "@/models/User";
import { hash } from "bcryptjs";
import { createSessionJWT, cookieOptions, publicUser } from "@/lib/auth";
import { Types } from "mongoose";

type CreatedLean = {
  _id: Types.ObjectId;
  email: string;
  firstName?: string;
  lastName?: string;
  role?: string;
};

export async function POST(req: Request) {
  await connectToDB();

  const body = await req.json().catch(() => ({} as Partial<{
    firstName: string;
    lastName: string;
    email: string;
    password: string;
  }>));

  const firstName = (body.firstName || "").trim();
  const lastName  = (body.lastName || "").trim();
  const email     = (body.email || "").trim().toLowerCase();
  const password  = String(body.password || "");

  if (!firstName || !lastName || !email || !password) {
    return NextResponse.json({ error: "Vorname, Nachname, E-Mail und Passwort sind erforderlich" }, { status: 400 });
  }
  if (password.length < 8) {
    return NextResponse.json({ error: "Passwort muss mindestens 8 Zeichen haben" }, { status: 400 });
  }

  const existing = await User.findOne({ email }).select({ _id: 1 }).lean();
  if (existing) {
    return NextResponse.json({ error: "E-Mail ist bereits registriert" }, { status: 409 });
  }

  const passwordHash = await hash(password, 10);

  // anlegen (Mongoose Document zurück)
  const createdDoc = await User.create({
    email,
    firstName,
    lastName,
    passwordHash,
    // role: "user", // nur setzen, falls dein Schema keinen Default hat
  });

  // in ein schlankes Plain Object konvertieren und streng typisieren
  const lean = createdDoc.toObject() as CreatedLean;

  const token = await createSessionJWT({
    sub: String(lean._id),
    email: lean.email,
    role: lean.role,
  });

  const name = [lean.firstName, lean.lastName].filter(Boolean).join(" ");

  const safeUser = publicUser({
    _id: lean._id,
    email: lean.email,
    firstName: lean.firstName,
    lastName: lean.lastName,
    name,
    role: lean.role,
  });

  const res = NextResponse.json({ user: safeUser }, { status: 201 });
  res.cookies.set("qnotes_session", token, cookieOptions());
  return res;
}
