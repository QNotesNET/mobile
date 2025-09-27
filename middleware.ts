// middleware.ts
import { NextResponse, NextRequest } from "next/server";

const PUBLIC_PREFIXES = [
  "/login",
  "/register",
  "/forgot-password",
  "/reset-password",

  // auth apis
  "/api/auth/login",
  "/api/auth/register",
  "/api/auth/forgot",
  "/api/auth/reset",

  // qr/resolve & public apis
  "/s",
  "/api/pages/resolve",

  // static
  "/_next",           // _next/static & _next/image
  "/favicon.ico",
  "/apple-icon.png",
  "/icon.png",
  "/images",          // deine public/images
];

function isPublic(pathname: string) {
  return PUBLIC_PREFIXES.some((p) => pathname === p || pathname.startsWith(p + "/"));
}

export function middleware(req: NextRequest) {
  const { pathname, search } = req.nextUrl;
  const token = req.cookies.get("qnotes_session")?.value;

  // öffentliche Routen & Assets immer erlauben
  if (isPublic(pathname)) return NextResponse.next();

  // nicht eingeloggt -> zu /login?next=...
  if (!token) {
    const url = new URL("/login", req.url);
    url.searchParams.set("next", pathname + search);
    return NextResponse.redirect(url);
  }

  // eingeloggt & versucht auf auth-pages -> nach Hause
  if (["/login", "/register", "/forgot-password", "/reset-password"].includes(pathname)) {
    return NextResponse.redirect(new URL("/", req.url));
  }

  return NextResponse.next();
}

// Auf alles außer den offensichtlichen statics anwenden
export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|apple-icon.png|icon.png|images/).*)"],
};
