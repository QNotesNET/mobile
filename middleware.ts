// middleware.ts (ROOT!)
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { jwtVerify } from "jose";

const secret = new TextEncoder().encode(process.env.JWT_SECRET || "dev-secret");

// öffentliche Pfade
const PUBLIC_PATHS = ["/login", "/register"];
const PUBLIC_FILE = /\.(.*)$/; // Assets mit Dateiendung

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Public & technische Routen freigeben
  if (
    PUBLIC_PATHS.includes(pathname) ||
    pathname.startsWith("/api/") ||
    pathname.startsWith("/_next/") ||
    PUBLIC_FILE.test(pathname)
    // ggf. weitere Ausnahmen:
    // || pathname.startsWith("/s/")
  ) {
    return NextResponse.next();
  }

  const token = req.cookies.get("qnotes_session")?.value;

  if (!token) {
    const url = req.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("next", pathname);
    return NextResponse.redirect(url);
  }

  try {
    await jwtVerify(token, secret);
    return NextResponse.next();
  } catch {
    const url = req.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("next", pathname);
    const res = NextResponse.redirect(url);
    res.cookies.set("qnotes_session", "", { path: "/", maxAge: 0 });
    return res;
  }
}

// Matcher: alles außer _next, api und Dateien mit Endung
export const config = {
  matcher: ["/((?!_next|api|.*\\..*).*)"],
};
