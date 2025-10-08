// app/api/qr/single/route.ts
import { NextResponse } from "next/server";
import { qrDataUrlFromText, buildNotebookClaimUrl } from "@/lib/qr";

// Demo: hier würdest du für notebookId einen Einmal-Token aus DB erzeugen/speichern
async function createOneTimeTokenForNotebook(notebookId: string) {
  // TODO: DB insert + expiry
  return `one-time-${notebookId}-${Date.now()}`;
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const notebookId = searchParams.get("notebookId");
  if (!notebookId) return NextResponse.json({ error: "notebookId required" }, { status: 400 });

  const token = await createOneTimeTokenForNotebook(notebookId);
  const targetUrl = buildNotebookClaimUrl(token);
  const dataUrl = await qrDataUrlFromText(targetUrl);

  return NextResponse.json({ dataUrl, targetUrl });
}
