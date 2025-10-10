import { NextResponse } from "next/server";
import QRCode from "qrcode";

export const runtime = "nodejs";

function toArrayBuffer(u8: Uint8Array): ArrayBuffer {
  const buf = u8.buffer as ArrayBuffer | SharedArrayBuffer;
  if (buf instanceof ArrayBuffer) return buf.slice(u8.byteOffset, u8.byteOffset + u8.byteLength);
  const copy = new Uint8Array(u8.byteLength);
  copy.set(u8);
  return copy.buffer;
}

export async function GET(req: Request, ctx: { params: Promise<{ token: string }> }) {
  try {
    const { token } = await ctx.params;
    const { origin } = new URL(req.url);
    const base = process.env.NEXT_PUBLIC_APP_URL || process.env.APP_URL || origin;
    const targetUrl = new URL(`/s/${encodeURIComponent(token)}`, base).toString();

    const png = await QRCode.toBuffer(targetUrl, {
      type: "png",
      errorCorrectionLevel: "M",
      margin: 1,
      width: 1024,
      color: { dark: "#000000", light: "#ffffff" },
    });

    return new NextResponse(toArrayBuffer(new Uint8Array(png)), {
      status: 200,
      headers: {
        "Content-Type": "image/png",
        "Content-Disposition": `inline; filename="qnotes-qr-${token}.png"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (e) {
    console.error(e);
    return new NextResponse("Server error", { status: 500 });
  }
}
