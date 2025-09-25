export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { verifySessionJWT } from "@/lib/auth";

export async function GET(req: Request) {
  const cookie = (req.headers.get("cookie") || "")
    .split(/;\s*/)
    .find((c) => c.startsWith("qnotes_session="));

  if (!cookie) return NextResponse.json({ user: null }, { status: 200 });

  const token = decodeURIComponent(cookie.split("=")[1]);
  try {
    const payload = await verifySessionJWT(token);
    return NextResponse.json({ user: { id: payload.sub, email: payload.email, role: payload.role ?? "user" } });
  } catch {
    return NextResponse.json({ user: null }, { status: 200 });
  }
}
