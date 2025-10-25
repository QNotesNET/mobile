import { NextResponse } from "next/server";
import connectToDB from "@/lib/mongoose";
import Contact from "@/models/Contact";
import { verifySessionJWT, SESSION_COOKIE_NAME } from "@/lib/auth";

export const runtime = "nodejs";

// === Hilfsfunktion zum User aus Cookie ===
async function getUserFromRequest(req: Request) {
  const cookieHeader = req.headers.get("cookie");
  if (!cookieHeader) return null;

  const cookie = cookieHeader
    .split(";")
    .map((x) => x.trim())
    .find((x) => x.startsWith(`${SESSION_COOKIE_NAME}=`));

  if (!cookie) return null;
  const token = cookie.split("=")[1];
  try {
    const user = await verifySessionJWT(token);
    return user;
  } catch {
    return null;
  }
}

// === GET /api/contacts ===
export async function GET(req: Request) {
  await connectToDB();
  const user = await getUserFromRequest(req);
  if (!user)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const contacts = await Contact.find({ userId: user.sub })
    .sort({ createdAt: -1 })
    .lean();

  return NextResponse.json({ contacts });
}

// === POST /api/contacts ===
export async function POST(req: Request) {
  await connectToDB();
  const user = await getUserFromRequest(req);
  if (!user)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const data = await req.json();
  const contact = await Contact.create({
    userId: user.sub,
    ...data,
  });

  return NextResponse.json({ contact }, { status: 201 });
}
