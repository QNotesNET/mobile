// lib/session.ts
import { cookies } from "next/headers";
import { verifySessionJWT } from "@/lib/auth";

export type SessionUser = { id: string; email: string; role?: string } | null;

export async function getCurrentUser(): Promise<SessionUser> {
  const token = (await cookies()).get("qnotes_session")?.value;
  if (!token) return null;
  try {
    const p = await verifySessionJWT(token);
    return { id: String(p.sub), email: String(p.email), role: p.role as string | undefined };
  } catch {
    return null;
  }
}
