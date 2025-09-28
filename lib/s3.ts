// lib/s3.ts
import { S3Client } from "@aws-sdk/client-s3";

export function s3Client() {
  const region = process.env.AWS_REGION!;
  return new S3Client({
    region,
    credentials: {
      accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
    },
  });
}

export function s3PublicUrl(key: string) {
  const base =
    process.env.S3_PUBLIC_URL_BASE ||
    `https://${process.env.S3_BUCKET}.s3.${process.env.AWS_REGION}.amazonaws.com`;
  return `${base}/${key}`;
}
