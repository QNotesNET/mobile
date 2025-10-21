// lib/google-api.ts
import { GOOGLE_TOKEN_URL } from "@/lib/google-oauth";
import GoogleAccount from "@/models/GoogleAccount";
import connectToDB from "@/lib/mongoose";

export async function getValidAccessToken(userId: string) {
  await connectToDB();
  const acc = await GoogleAccount.findOne({ userId }).lean();
  if (!acc) throw new Error("Google not linked");

  // @ts-expect-error --- gibts scho
  const isExpired = !acc.expiryDate || new Date(acc.expiryDate) <= new Date();
  // @ts-expect-error --- gibts scho
  if (!isExpired) return acc.accessToken as string;
  // @ts-expect-error --- gibts scho
  if (!acc.refreshToken) throw new Error("No refresh_token to renew access");

  const body = new URLSearchParams({
    client_id: process.env.GOOGLE_CLIENT_ID!,
    client_secret: process.env.GOOGLE_CLIENT_SECRET!,
    // @ts-expect-error --- gibts scho
    refresh_token: acc.refreshToken,
    grant_type: "refresh_token",
  });

  const res = await fetch(GOOGLE_TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });
  if (!res.ok) {
    const t = await res.text();
    throw new Error("Token refresh failed: " + t);
  }
  const json = await res.json();
  const access_token = json.access_token as string;
  const expires_in = Number(json.expires_in || 3600);

  await GoogleAccount.findOneAndUpdate(
    { userId },
    {
      accessToken: access_token,
      expiryDate: new Date(Date.now() + (expires_in - 60) * 1000),
    }
  );

  return access_token;
}

export async function googleFetch(
  userId: string,
  url: string,
  init: RequestInit = {}
) {
  const token = await getValidAccessToken(userId);
  const headers = new Headers(init.headers || {});
  headers.set("Authorization", `Bearer ${token}`);
  headers.set("Accept", "application/json");
  if (init.body && !headers.has("Content-Type"))
    headers.set("Content-Type", "application/json");

  const res = await fetch(url, { ...init, headers });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Google API ${res.status}: ${text}`);
  }
  return res.json();
}
