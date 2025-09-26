// lib/auth.ts
import { SignJWT, jwtVerify } from "jose";
import type { UserDoc } from "@/models/User";

const secret = new TextEncoder().encode(process.env.JWT_SECRET || "dev-secret");
const jwtExpires = process.env.JWT_EXPIRES || "7d";

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
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: "/",
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
