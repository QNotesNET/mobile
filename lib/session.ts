// lib/session.ts
import { cookies } from "next/headers";
import { verifySessionJWT } from "@/lib/auth";

/** Helfer: Wandelt unknown → string (oder undefined), ohne any zu verwenden */
function toStr(v: unknown): string | undefined {
  if (typeof v === "string") return v;
  if (typeof v === "number") return String(v);
  return undefined;
}

/** Minimales Payload-Shape, das wir aus dem JWT lesen (nur Felder, die wir nutzen). */
type JwtSessionPayload = {
  sub?: unknown;
  email?: unknown;
  role?: unknown;
  firstName?: unknown;
  lastName?: unknown;
};

// --- bestehend ---
export type SessionUser = { id: string; email: string; role?: string } | null;

export async function getCurrentUser(): Promise<SessionUser> {
  const token = (await cookies()).get("qnotes_session")?.value;
  if (!token) return null;
  try {
    const p = (await verifySessionJWT(token)) as unknown as JwtSessionPayload;
    const id = toStr(p.sub);
    const email = toStr(p.email);
    if (!id || !email) return null;
    const role = toStr(p.role);
    return { id, email, role };
  } catch {
    return null;
  }
}

// --- neu (nur das Nötige für die Avatar/Profile-Routen) ---
export type SessionData = {
  userId: string;
  user: {
    _id: string;        // für Code der user?._id erwartet
    id: string;         // für Code der user.id erwartet
    email?: string;
    role?: string;
    firstName?: string; // optional – falls im JWT vorhanden
    lastName?: string;  // optional
  };
};

/** Gleiche Quelle wie getCurrentUser: liest das JWT aus qnotes_session und baut ein konsistentes Session-Objekt. */
export async function getSession(): Promise<SessionData | null> {
  const token = (await cookies()).get("qnotes_session")?.value;
  if (!token) return null;

  try {
    const p = (await verifySessionJWT(token)) as unknown as JwtSessionPayload;

    const userId = toStr(p.sub);
    if (!userId) return null;

    const email = toStr(p.email);
    const role = toStr(p.role);
    const firstName = toStr(p.firstName);
    const lastName = toStr(p.lastName);

    return {
      userId,
      user: {
        _id: userId,
        id: userId,
        email,
        role,
        firstName,
        lastName,
      },
    };
  } catch {
    return null;
  }
}

/** Bequemer Helper für nur die User-ID. */
export async function getSessionUserId(): Promise<string | null> {
  const s = await getSession();
  return s?.userId ?? null;
}
