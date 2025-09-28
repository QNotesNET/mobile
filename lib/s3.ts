// lib/s3.ts
import { S3Client } from "@aws-sdk/client-s3";

/** wirft eine klare Fehlermeldung, wenn eine ENV fehlt */
function required(name: string, value: string | undefined): string {
  if (!value || value.trim() === "") {
    throw new Error(`Missing env: ${name}`);
  }
  return value;
}

/** Liesst alle relevanten S3-ENV-Variablen */
export function s3Env() {
  const region = required("S3_REGION", process.env.S3_REGION);
  const bucket = required("S3_BUCKET", process.env.S3_BUCKET);
  const accessKeyId = required("S3_ACCESS_KEY_ID", process.env.S3_ACCESS_KEY_ID);
  const secretAccessKey = required(
    "S3_SECRET_ACCESS_KEY",
    process.env.S3_SECRET_ACCESS_KEY
  );

  // Optional: eigener CDN/Domain-Basis-Pfad (sonst Standard S3-URL)
  const publicBase =
    process.env.S3_PUBLIC_BASE || `https://${bucket}.s3.${region}.amazonaws.com`;

  return { region, bucket, accessKeyId, secretAccessKey, publicBase };
}

/** Erstellt den S3-Client mit Credentials aus ENV */
export function s3Client() {
  const { region, accessKeyId, secretAccessKey } = s3Env();
  return new S3Client({
    region,
    credentials: { accessKeyId, secretAccessKey },
  });
}

/** Erzeugt einen stabilen S3-Key für Seitenbilder */
export function s3KeyForPageImage(pageId: string, fileName: string) {
  const safe = (fileName || "").replace(/[^a-zA-Z0-9._-]/g, "_");
  // z.B. pages/6543abc.../1727550000000_scan.png
  return `pages/${pageId}/${Date.now()}_${safe}`;
}

/** Öffentliche URL zum Objekt (nützlich für Anzeige/Download nach Upload) */
export function s3PublicUrl(key: string) {
  const { publicBase } = s3Env();
  return `${publicBase}/${key}`;
}
