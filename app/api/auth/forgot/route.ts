// app/api/auth/forgot/route.ts
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import crypto from "node:crypto";
import { connectToDB } from "@/lib/mongoose";
import User from "@/models/User";
import { sendMail } from "@/lib/email";

type Body = { email?: string };

export async function POST(req: Request) {
  try {
    await connectToDB();

    const body = (await req.json().catch(() => ({} as Body))) ?? {};
    const email = String(body.email || "").trim().toLowerCase();
    if (!email) {
      return NextResponse.json({ error: "Missing email" }, { status: 400 });
    }

    const user = await User.findOne({ email }).exec();

    // Token + Ablauf (1h)
    const token = crypto.randomBytes(24).toString("hex");
    const expires = new Date(Date.now() + 1000 * 60 * 60);

    if (user) {
      user.set("resetToken", token);
      user.set("resetTokenExpiresAt", expires);
      await user.save();
    }

    const appUrl = process.env.APP_URL || "http://localhost:3000";
    const resetUrl = `${appUrl.replace(/\/$/, "")}/reset-password?token=${encodeURIComponent(token)}`;

    // Nur generisches Feedback – nicht verraten, ob E-Mail existiert
    const html = `
      <p>Hi,</p>
      <p>Du hast das Zurücksetzen deines QNotes-Passwortes angefordert.</p>
      <p><a href="${resetUrl}">Passwort jetzt zurücksetzen</a></p>
      <p>Der Link ist 1 Stunde gültig. Wenn du das nicht warst, ignoriere diese E-Mail.</p>
    `;

    await sendMail({
      to: email,
      subject: "QNotes: Passwort zurücksetzen",
      html,
    });

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("forgot route error:", err);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
