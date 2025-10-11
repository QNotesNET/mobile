// /app/api/qr/single/route.ts
import { NextResponse } from "next/server";
import connectToDB from "@/lib/mongoose";
import { ObjectId } from "mongodb";

export const runtime = "nodejs";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const notebookId = searchParams.get("notebookId");
  if (!notebookId) return NextResponse.json({ error: "Missing notebookId" }, { status: 400 });

  try { new ObjectId(notebookId); } catch {
    return NextResponse.json({ error: "Invalid notebookId" }, { status: 400 });
  }

  const mongoose = await connectToDB();
  const db = mongoose.connection.db!;
  const col = db.collection("notebooks");

  const token = `one-time-${notebookId}-${Date.now()}`;
  const res = await col.updateOne(
    { _id: new ObjectId(notebookId) },
    { $set: { claimToken: token, claimTokenCreatedAt: new Date() } }
  );
  if (res.matchedCount !== 1) return NextResponse.json({ error: "Notebook not found" }, { status: 404 });

  const origin = process.env.APP_ORIGIN ?? "http://localhost:3000";
  const url = `${origin}/register-notebook?token=${encodeURIComponent(token)}`;
  return NextResponse.json({ token, url });
}
