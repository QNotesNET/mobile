import { NextResponse } from "next/server";
import { cookies } from "next/headers";

export async function POST(req: Request) {
  // Session-Cookie löschen
  (await cookies()).set("qnotes_session", "", {
    path: "/",
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    maxAge: 0, // sofort ablaufen
  });

  // optional: ?next=/irgendwo unterstützen
  const url = new URL(req.url);
  const next = url.searchParams.get("next") || "/login";

  // 303 = see other (sicher nach POST)
  return NextResponse.redirect(new URL(next, req.url), { status: 303 });
}
