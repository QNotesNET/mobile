// app/api/integrations/google/login/route.ts
import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import {
  GOOGLE_AUTH_BASE,
  GOOGLE_SCOPES,
  randomVerifier,
  challengeFromVerifier,
} from "@/lib/google-oauth";

export const runtime = "nodejs";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const redirectUri = `${url.origin}/api/integrations/google`; // dein Callback

  const state = crypto.randomUUID();
  const codeVerifier = randomVerifier();
  const codeChallenge = challengeFromVerifier(codeVerifier);

  // kurzlebige Cookies für PKCE + CSRF
  const c = await cookies();
  c.set("google_oauth_state", state, { httpOnly: true, path: "/", maxAge: 600, sameSite: "lax" });
  c.set("google_code_verifier", codeVerifier, { httpOnly: true, path: "/", maxAge: 600, sameSite: "lax" });

  const params = new URLSearchParams({
    client_id: process.env.GOOGLE_CLIENT_ID!,
    redirect_uri: redirectUri,
    response_type: "code",
    access_type: "offline", // refresh_token erhalten
    scope: GOOGLE_SCOPES,
    state,
    prompt: "consent",      // für dev sicheres Erhalten von refresh_token
    code_challenge: codeChallenge,
    code_challenge_method: "S256",
    include_granted_scopes: "true",
  });

  return NextResponse.redirect(`${GOOGLE_AUTH_BASE}?${params.toString()}`);
}
