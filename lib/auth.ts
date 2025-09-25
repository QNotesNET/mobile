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

export function publicUser(
  u: Pick<UserDoc, "_id" | "email" | "name" | "firstName" | "lastName" | "role">
) {
  const first = u.firstName ?? "";
  const last = u.lastName ?? "";
  const fallbackFullName = [first, last].filter(Boolean).join(" ").trim();

  return {
    id: String(u._id),
    email: u.email,
    firstName: u.firstName ?? null,
    lastName: u.lastName ?? null,
    // wichtig: Klammern bei ?? und ||, damit TS zufrieden ist
    name: u.name ?? (fallbackFullName || null),
    role: u.role ?? "user",
  };
}
