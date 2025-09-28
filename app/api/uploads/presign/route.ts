// app/api/uploads/presign/route.ts
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { randomUUID } from "node:crypto";
import { s3Client, s3PublicUrl } from "@/lib/s3";
import { getCurrentUser } from "@/lib/session";

type Body = { filename?: string; contentType?: string; prefix?: string };

export async function POST(req: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { filename = "file", contentType = "application/octet-stream", prefix } =
      ((await req.json().catch(() => ({}))) as Body) || {};

    const safeName = filename.replace(/[^a-z0-9.\-_]/gi, "_");
    const bucket = process.env.S3_BUCKET!;
    const region = process.env.AWS_REGION!;
    const key = `${prefix ?? "uploads"}/${user.id}/${Date.now()}-${randomUUID()}-${safeName}`;

    const cmd = new PutObjectCommand({
      Bucket: bucket,
      Key: key,
      ContentType: contentType,
      ACL: "public-read", // because we use public-read bucket policy
    });

    const url = await getSignedUrl(s3Client(), cmd, { expiresIn: 60 }); // 60s
    const publicUrl = s3PublicUrl(key);

    return NextResponse.json({ uploadUrl: url, key, publicUrl, region, bucket });
  } catch (e) {
    console.error("presign error", e);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
