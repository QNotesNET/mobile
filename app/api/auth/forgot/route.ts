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

    // Neues Design: schwarz/weiß, großes Logo, großer Text, Footer mit Links
    const html = `
      <!doctype html>
      <html>
        <head>
          <meta charset="utf-8" />
          <meta name="viewport" content="width=device-width,initial-scale=1" />
        </head>
        <body style="margin:0;background:#f5f6f7;font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial; color:#111;">
          <table width="100%" cellpadding="0" cellspacing="0" role="presentation">
            <tr>
              <td align="center" style="padding:40px 16px;">
                <!-- white card -->
                <table width="680" max-width="680" cellpadding="0" cellspacing="0" role="presentation" style="background:#ffffff;border-radius:6px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.06);">
                  <tr>
                    <td style="padding:34px 40px 24px 40px;" align="center">
                      <!-- logo on white -->
                      <div style="background:#ffffff;padding:8px;border-radius:4px;display:inline-block;">
                        <img src="https://app.powerbook.at/images/logos/logo-black.svg" alt="Powerbook" width="160" style="display:block;" />
                      </div>
                    </td>
                  </tr>

                  <tr>
                    <td style="padding:0 40px 24px 40px;text-align:center;">
                      <h1 style="margin:0;font-size:28px;line-height:34px;font-weight:600;color:#000;">Passwort zurücksetzen</h1>
                    </td>
                  </tr>

                  <tr>
                    <td style="padding:0 40px 22px 40px;text-align:center;">
                      <p style="margin:0;font-size:15px;color:#333;line-height:22px;">
                        Du hast das Zurücksetzen deines Powerbook-Passworts angefordert. Klicke auf den Button, um ein neues Passwort zu setzen.
                      </p>
                    </td>
                  </tr>

                  <tr>
                    <td style="padding:18px 40px 34px 40px;" align="center">
                      <a href="${resetUrl}" target="_blank" style="display:inline-block;padding:12px 20px;border-radius:6px;background:#000;color:#fff;text-decoration:none;font-weight:600;">
                        Passwort jetzt zurücksetzen
                      </a>
                    </td>
                  </tr>

                  <tr>
                    <td style="padding:0 40px 28px 40px;text-align:center;">
                      <p style="margin:0;font-size:13px;color:#666;line-height:20px;">
                        Der Link ist 1 Stunde gültig. Wenn du das nicht angefordert hast, kannst du diese E-Mail ignorieren.
                      </p>
                    </td>
                  </tr>

                  <tr>
                    <td style="padding:0 24px 24px 24px;border-top:1px solid #eee;">
                      <table width="100%" cellpadding="0" cellspacing="0" role="presentation">
                        <tr>
                          <td style="padding:16px 0;font-size:12px;color:#666;text-align:center;">
                            <div>Powerbook · <a href="mailto:noreply@powerbook.at" style="color:#666;text-decoration:underline;">noreply@powerbook.at</a></div>
                            <div style="margin-top:8px;">
                              <a href="https://powerbook.at/impressum" style="color:#666;text-decoration:underline;margin:0 8px;">Impressum</a> |
                              <a href="https://powerbook.at/datenschutz" style="color:#666;text-decoration:underline;margin:0 8px;">Datenschutz</a> |
                              <a href="https://powerbook.at/agb" style="color:#666;text-decoration:underline;margin:0 8px;">AGB</a>
                            </div>
                          </td>
                        </tr>
                      </table>
                    </td>
                  </tr>

                </table>
                <!-- end card -->
              </td>
            </tr>
          </table>
        </body>
      </html>
    `;

    await sendMail({
      to: email,
      subject: "Powerbook: Passwort zurücksetzen",
      html,
    });

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("forgot route error:", err);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
