// app/api/upload-local/route.ts
import { NextResponse } from "next/server";
import { connectToDB } from "@/lib/mongoose";
import Page from "@/models/PageModel";
import { randomBytes } from "crypto";
import { writeFile, mkdir } from "fs/promises";
import path from "path";

export async function POST(req: Request) {
  await connectToDB();
  const form = await req.formData();
  const file = form.get("file") as File | null;
  const pageId = String(form.get("pageId") || "");
  if (!file || !pageId) return NextResponse.json({ error: "Bad data" }, { status: 400 });

  // Dateiname
  const arrayBuffer = await file.arrayBuffer();
  const buf = Buffer.from(arrayBuffer);
  const ext = (file.name.split(".").pop() || "jpg").toLowerCase();
  const name = `${Date.now()}-${randomBytes(6).toString("hex")}.${ext}`;

  const uploadDir = path.join(process.cwd(), "public", "uploads");
  await mkdir(uploadDir, { recursive: true });
  const filePath = path.join(uploadDir, name);
  await writeFile(filePath, buf);

  const url = `/uploads/${name}`;
  await Page.updateOne({ _id: pageId }, { $push: { images: { url } } });

  return NextResponse.json({ ok: true, url });
}
