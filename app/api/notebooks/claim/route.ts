// app/api/notebooks/claim/route.ts
import { NextResponse } from "next/server";

// TODO: Hole userId aus Session (z.B. Auth Middleware)
async function getUserIdFromRequest(_req: Request) {
  return "demo-user-1";
}

// TODO: DB: token prüfen, notebook finden, zuweisen, token invalidieren
async function claimNotebookByToken(token: string, userId: string) {
  // Fake: akzeptiere alles, was mit "one-time" oder "sheet-token" beginnt
  if (!/^((one-time|sheet-token)-)/.test(token)) return { ok: false, error: "Ungültiger Token." };
  const notebookId = token.split("-")[2] || "unknown";
  // DB: update notebooks set user_id = userId where id = notebookId
  return { ok: true, notebookId };
}

export async function POST(req: Request) {
  const { token } = await req.json();
  if (!token) return NextResponse.json({ error: "token required" }, { status: 400 });
  const userId = await getUserIdFromRequest(req);
  const res = await claimNotebookByToken(token, userId);
  if (!res.ok) return NextResponse.json({ error: res.error }, { status: 400 });
  return NextResponse.json({ success: true, notebookId: res.notebookId });
}
