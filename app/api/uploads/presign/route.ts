// app/api/uploads/presign/route.ts
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { s3Client, s3Env, s3KeyForPageImage, s3PublicUrl } from "@/lib/s3";

type Body = {
  pageId?: string;
  fileName?: string;
  contentType?: string;
};

export async function POST(req: Request) {
  try {
    const { bucket, region } = s3Env();

    const body: Body = (await req.json().catch(() => ({}))) ?? {};
    const pageId = String(body.pageId || "").trim();
    const fileName = String(body.fileName || "").trim();
    const contentType =
      String(body.contentType || "").trim() || "application/octet-stream";

    if (!pageId || !fileName) {
      return NextResponse.json(
        { error: "Missing pageId or fileName" },
        { status: 400 }
      );
    }

    const key = s3KeyForPageImage(pageId, fileName);

    const cmd = new PutObjectCommand({
      Bucket: bucket,
      Key: key,
      ContentType: contentType,
      ACL: "private",
    });

    const uploadUrl = await getSignedUrl(s3Client(), cmd, { expiresIn: 60 });
    const publicUrl = s3PublicUrl(key);

    return NextResponse.json({ uploadUrl, key, publicUrl, region, bucket });
  } catch (err) {
    console.error("presign error", err);
    return NextResponse.json({ error: "Presign failed" }, { status: 500 });
  }
}
