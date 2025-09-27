// app/api/auth/forgot/route.ts
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import crypto from "node:crypto";
import { connectToDB } from "@/lib/mongoose";
import User from "@/models/User";
import nodemailer from "nodemailer";

type Body = { email?: string };

async function sendResetMail(to: string, resetUrl: string) {
  const smtpHost = process.env.SMTP_HOST;
  const smtpPort = Number(process.env.SMTP_PORT || 0);
  const smtpUser = process.env.SMTP_USER;
  const smtpPass = process.env.SMTP_PASS;
  const from = process.env.MAIL_FROM || "noreply@qnotes.local";

  if (smtpHost && smtpPort && smtpUser && smtpPass) {
    const transporter = nodemailer.createTransport({
      host: smtpHost,
      port: smtpPort,
      secure: smtpPort === 465,
      auth: { user: smtpUser, pass: smtpPass },
    });

    const html = `
      <p>Hi,</p>
      <p>Du hast das Zurücksetzen deines QNotes-Passwortes angefordert. Klicke auf den Link:</p>
      <p><a href="${resetUrl}">${resetUrl}</a></p>
      <p>Wenn du das nicht angefordert hast, ignoriere diese Nachricht.</p>
    `;

    await transporter.sendMail({
      from,
      to,
      subject: "QNotes: Passwort zurücksetzen",
      html,
    });
    return;
  }

  // Kein SMTP konfiguriert: logge den Link (zum Testen)
  console.log("Password reset link (no SMTP configured):", resetUrl);
}

export async function POST(req: Request) {
  try {
    await connectToDB();

    const body = (await req.json().catch(() => ({} as Body))) ?? {};
    const email = String(body.email || "").trim().toLowerCase();
    if (!email) {
      return NextResponse.json({ error: "Missing email" }, { status: 400 });
    }

    // Egal ob gefunden oder nicht, wir antworten identisch
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

    await sendResetMail(email, resetUrl);

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("forgot route error:", err);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
