// lib/qr.ts
import QRCode from "qrcode";

/** Baut die Ziel-URL, die später den Claim-Flow triggert */
export function buildNotebookClaimUrl(token: string) {
  // Domain ggf. aus ENV ziehen
  const base = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  return `${base}/register-notebook?token=${encodeURIComponent(token)}`;
}

/** QR als DataURL (PNG, 512px) */
export async function qrDataUrlFromText(text: string) {
  return QRCode.toDataURL(text, { width: 512, margin: 1 });
}
