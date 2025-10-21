// app/api/integrations/google/route.ts
import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import connectToDB from "@/lib/mongoose";
import GoogleAccount from "@/models/GoogleAccount";
import { GOOGLE_TOKEN_URL } from "@/lib/google-oauth";
import { getCurrentUser } from "@/lib/session"; // du hast das bereits
import {
  ensureLocalGoogleTaskList,
  importOpenGoogleTasksOnce,
} from "@/lib/google-tasks";

export const runtime = "nodejs";

export async function GET(req: Request) {
  const { searchParams, origin } = new URL(req.url);
  const code = searchParams.get("code");
  const state = searchParams.get("state");
  const err = searchParams.get("error");

  if (err) {
    console.error("Google OAuth error:", err);
    return NextResponse.redirect(`${origin}/integrations?google=error`);
  }

  const c = await cookies();
  const storedState = c.get("google_oauth_state")?.value;
  const codeVerifier = c.get("google_code_verifier")?.value;

  if (
    !code ||
    !state ||
    !storedState ||
    state !== storedState ||
    !codeVerifier
  ) {
    return NextResponse.json({ error: "Invalid OAuth state" }, { status: 400 });
  }

  // Cookies nach Verwendung löschen
  c.delete("google_oauth_state");
  c.delete("google_code_verifier");

  // Exchange Code → Token
  const body = new URLSearchParams({
    client_id: process.env.GOOGLE_CLIENT_ID!,
    client_secret: process.env.GOOGLE_CLIENT_SECRET!,
    code,
    grant_type: "authorization_code",
    redirect_uri: `${origin}/api/integrations/google`,
    code_verifier: codeVerifier,
  });

  const tokenRes = await fetch(GOOGLE_TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });

  if (!tokenRes.ok) {
    const t = await tokenRes.text();
    console.error("Token exchange failed:", t);
    return NextResponse.redirect(`${origin}/integrations?google=token_failed`);
  }

  const tokenJson = await tokenRes.json();
  const { access_token, refresh_token, expires_in, id_token, scope } =
    tokenJson as {
      access_token: string;
      refresh_token?: string;
      expires_in: number;
      id_token?: string;
      scope?: string;
    };

  // id_token dekodieren für Email + Sub (keine Verifikation notwendig here, nur Lesen)
  let sub = "";
  let email = "";
  try {
    const payload = JSON.parse(
      Buffer.from(String(id_token).split(".")[1], "base64").toString("utf8")
    );
    sub = payload.sub;
    email = payload.email;
  } catch {}

  // Für jetzt: entweder speichern oder nur loggen
  const me = await getCurrentUser();
  if (!me) {
    console.warn("No session user for Google integration");
    return NextResponse.redirect(`${origin}/integrations?google=nosession`);
  }

  try {
    await connectToDB();

    // Persistieren (optional – zum Testen kannst du diesen Block überspringen)
    const expiryDate = new Date(Date.now() + (expires_in - 60) * 1000);
    await GoogleAccount.findOneAndUpdate(
      { userId: me.id },
      {
        userId: me.id,
        sub,
        email,
        scope: scope || "",
        accessToken: access_token,
        refreshToken: refresh_token ?? undefined, // kann bei Re-Consent fehlen
        expiryDate,
      },
      { upsert: true, new: true }
    );

    try {
      const localList = await ensureLocalGoogleTaskList(me.id);
      await importOpenGoogleTasksOnce(me.id, String(localList._id));
    } catch (e) {
      console.error("Google Tasks initial import failed:", e);
    }
  } catch (e) {
    console.error("Failed to save Google account:", e);
  }

  // Zum Testen: E-Mail in Query anzeigen
  return NextResponse.redirect(
    `${origin}/integrations?google=ok&email=${encodeURIComponent(email || "")}`
  );
}
