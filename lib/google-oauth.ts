// lib/google-oauth.ts
import crypto from "crypto";

export const GOOGLE_AUTH_BASE = "https://accounts.google.com/o/oauth2/v2/auth";
export const GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token";

export const GOOGLE_SCOPES = [
  "openid",
  "email",
  "profile",
  "https://www.googleapis.com/auth/calendar.readonly",
  "https://www.googleapis.com/auth/calendar.events",
  "https://www.googleapis.com/auth/tasks",
  "https://www.googleapis.com/auth/tasks.readonly",
].join(" ");

export function base64url(input: Buffer | string) {
  return Buffer.from(input)
    .toString("base64")
    .replace(/=/g, "")
    .replace(/\+/g, "-")
    .replace(/\//g, "_");
}

export function randomVerifier() {
  return base64url(crypto.randomBytes(32));
}

export function challengeFromVerifier(verifier: string) {
  const hash = crypto.createHash("sha256").update(verifier).digest();
  return base64url(hash);
}
