import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { jwtVerify } from "jose";

const secret = new TextEncoder().encode(process.env.JWT_SECRET || "dev-secret");

// schützt alle Pages außer /login, /register, /api/*, statische Assets:
export const config = {
  matcher: ["/((?!api|_next|favicon.ico|login|register|.*\\.(png|jpg|jpeg|svg|css|js)).*)"],
};

export async function middleware(req: NextRequest) {
  const token = req.cookies.get("qnotes_session")?.value;
  const { pathname } = req.nextUrl;

  // öffentliche Seiten erlauben
  if (pathname.startsWith("/login") || pathname.startsWith("/register")) {
    return NextResponse.next();
  }

  if (!token) return NextResponse.redirect(new URL("/login", req.url));

  try {
    await jwtVerify(token, secret);
    return NextResponse.next();
  } catch {
    return NextResponse.redirect(new URL("/login", req.url));
  }
}
