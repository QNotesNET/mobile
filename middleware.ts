// middleware.ts
import { NextResponse, NextRequest } from "next/server";

// Statisch öffentlich (Assets etc.)
const STATIC_PREFIXES = [
  "/_next", // _next/static & _next/image
  "/favicon.ico",
  "/apple-icon.png",
  "/icon.png",
  "/images", // public/images/*
];

// Public: immer erlauben (auch wenn eingeloggt)
/**
 * Passwort-Reset Flows müssen IMMER zugänglich sein:
 * - Seiten: /forgot-password, /reset-password
 * - APIs:   /api/auth/forgot, /api/auth/reset
 */
const RESET_PUBLIC = [
  "/forgot-password",
  "/reset-password",
  "/api/auth/forgot",
  "/api/auth/reset",
];

// Auth-Seiten: öffentlich, aber wenn bereits eingeloggt -> redirect nach "/"
const AUTH_PAGES = [
  "/login",
  "/register",
  "/api/auth/login",
  "/api/auth/register",
];

// Weitere öffentliche Routen (z.B. QR-Resolver, Shortlinks)
const OTHER_PUBLIC = [
  "/s", // /s/<token>
  "/api/pages/resolve", // token resolver API
  "/api/integrations",
  "/contact",
  "/api/contact",
  "/api/push"
];

function startsWithAny(pathname: string, prefixes: string[]) {
  return prefixes.some((p) => pathname === p || pathname.startsWith(p + "/"));
}

export function middleware(req: NextRequest) {
  const { pathname, search } = req.nextUrl;
  const token = req.cookies.get("qnotes_session")?.value;

  // 1) Immer erlauben: Static
  if (startsWithAny(pathname, STATIC_PREFIXES)) {
    return NextResponse.next();
  }

  // 2) Immer erlauben: Reset-Flows (Seiten + APIs)
  if (startsWithAny(pathname, RESET_PUBLIC)) {
    return NextResponse.next();
  }

  // 3) Auth-Seiten: wenn eingeloggt -> redirect nach "/", sonst erlauben
  if (startsWithAny(pathname, AUTH_PAGES)) {
    if (token) {
      return NextResponse.redirect(new URL("/", req.url));
    }
    return NextResponse.next();
  }

  // 4) Andere öffentliche Routen (Shortlinks etc.) erlauben
  if (startsWithAny(pathname, OTHER_PUBLIC)) {
    return NextResponse.next();
  }

  // 5) Rest: Login erforderlich
  if (!token) {
    const url = new URL("/login", req.url);
    url.searchParams.set("next", pathname + search);
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  // Alles matchen außer klar statischen Pfaden
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|apple-icon.png|icon.png|images/).*)",
  ],
};
