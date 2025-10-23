// lib/auth.ts
import { SignJWT, jwtVerify } from "jose";
import type { UserDoc } from "@/models/User";

// ===== Bestehende Konstanten =====
const secret = new TextEncoder().encode(process.env.JWT_SECRET || "dev-secret");
const jwtExpires = process.env.JWT_EXPIRES || "7d";

// 🔒 Neu: zentraler Cookie-Name, exportiert für deine Routes
export const SESSION_COOKIE_NAME = process.env.SESSION_COOKIE_NAME || "qnotes_session";

// ===== DEIN BESTEHENDER CODE (unverändert) =====
export async function createSessionJWT(payload: { sub: string; email: string; role?: string }) {
  return await new SignJWT(payload)
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(payload.sub)
    .setIssuedAt()
    .setExpirationTime(jwtExpires)
    .sign(secret);
}

export async function verifySessionJWT(token: string) {
  const { payload } = await jwtVerify(token, secret);
  return payload as { sub: string; email: string; role?: string; iat: number; exp: number };
}

export function cookieOptions() {
  return {
    httpOnly: true,
    secure: true, // MUSS true sein → sonst löscht iOS es
    sameSite: "none" as const, // Nur "none" erlaubt Cross-Domain + WebView
    path: "/",
    maxAge: 60 * 60 * 24 * 30, // 30 Tage persistente Session
  };
}


/**
 * Gibt ein sicheres, kompaktes User-Objekt zurück.
 * - `name` ist OPTIONAL und nicht Teil des UserDoc-Schemas — kann von außen übergeben werden.
 * - Falls `name` nicht übergeben wird, wird er aus firstName/lastName gebaut.
 */
export function publicUser(
  u: Pick<UserDoc, "_id" | "email" | "firstName" | "lastName" | "role"> & { name?: string }
) {
  const first = u.firstName ?? "";
  const last = u.lastName ?? "";
  const computedName = [first, last].filter(Boolean).join(" ").trim();

  return {
    id: String(u._id),
    email: u.email,
    firstName: u.firstName ?? null,
    lastName: u.lastName ?? null,
    name: (u.name ?? computedName) || null,
    role: u.role ?? "user",
  };
}

// ===== NEUE, PROMISE-FREIE HELFER (kein next/headers nötig) =====

/** Extrahiert den Session-Tokenwert aus einem Cookie-Header. */
export function getSessionTokenFromCookieHeader(cookieHeader: string | null | undefined): string | null {
  if (!cookieHeader) return null;
  // simple, robuste Parse-Variante
  const parts = cookieHeader.split(/;\s*/);
  for (const p of parts) {
    const [k, ...rest] = p.split("=");
    if (k === SESSION_COOKIE_NAME) return rest.join("=");
  }
  return null;
}

/**
 * Liest User-Infos aus dem Request (für API-Routes).
 * Vermeidet next/headers.cookies() → keine Typfehler auf Edge/Node.
 */
export async function getSessionUserFromRequest(
  req: Request
): Promise<{ userId: string; email?: string; role?: string } | null> {
  const token = getSessionTokenFromCookieHeader(req.headers.get("cookie"));
  if (!token) return null;

  try {
    const payload = await verifySessionJWT(token);
    if (!payload?.sub) return null;
    return { userId: payload.sub, email: payload.email, role: payload.role };
  } catch {
    return null;
  }
}
