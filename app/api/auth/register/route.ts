// /app/api/auth/register/route.ts
export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { connectToDB } from "@/lib/mongoose";
import User from "@/models/User";
import { hash } from "bcryptjs";
import { createSessionJWT, cookieOptions, publicUser, SESSION_COOKIE_NAME } from "@/lib/auth";
import { Types } from "mongoose";
import { sendMail } from "@/lib/email";

type CreatedLean = {
  _id: Types.ObjectId;
  email: string;
  firstName?: string;
  lastName?: string;
  role?: string;
};

export async function POST(req: Request) {
  await connectToDB();

  const body = await req.json().catch(
    () =>
      ({} as Partial<{
        firstName: string;
        lastName: string;
        email: string;
        password: string;
      }>)
  );

  const firstName = (body.firstName || "").trim();
  const lastName = (body.lastName || "").trim();
  const email = (body.email || "").trim().toLowerCase();
  const password = String(body.password || "");

  if (!firstName || !lastName || !email || !password) {
    return NextResponse.json(
      { error: "Vorname, Nachname, E-Mail und Passwort sind erforderlich" },
      { status: 400 }
    );
  }
  if (password.length < 8) {
    return NextResponse.json({ error: "Passwort muss mindestens 8 Zeichen haben" }, { status: 400 });
  }

  const existing = await User.findOne({ email }).select({ _id: 1 }).lean();
  if (existing) {
    return NextResponse.json({ error: "E-Mail ist bereits registriert" }, { status: 409 });
  }

  const passwordHash = await hash(password, 10);

  const createdDoc = await User.create({
    email,
    firstName,
    lastName,
    passwordHash,
  });

  const lean = createdDoc.toObject() as CreatedLean;

  const token = await createSessionJWT({
    sub: String(lean._id),
    email: lean.email,
    role: lean.role,
  });

  const name = [lean.firstName, lean.lastName].filter(Boolean).join(" ");

  const safeUser = publicUser({
    _id: lean._id,
    email: lean.email,
    firstName: lean.firstName,
    lastName: lean.lastName,
    name,
    role: lean.role,
  });

  // Willkommens-E-Mail (Design: schwarz/weiß, Logo, großer Text, Footer-Links)
  try {
    const appUrl = process.env.APP_URL || "http://localhost:3000";
    const loginUrl = `${appUrl.replace(/\/$/, "")}/login`;

    const welcomeHtml = `
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
                <table width="680" max-width="680" cellpadding="0" cellspacing="0" role="presentation" style="background:#ffffff;border-radius:6px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.06);">
                  <tr>
                    <td style="padding:34px 40px 10px 40px;" align="center">
                      <div style="background:#ffffff;padding:8px;border-radius:4px;display:inline-block;">
                        <img src="https://app.powerbook.at/images/logos/logo-black.svg" alt="Powerbook" width="160" style="display:block;" />
                      </div>
                    </td>
                  </tr>

                  <tr>
                    <td style="padding:0 40px 6px 40px;text-align:center;">
                      <h1 style="margin:0;font-size:28px;line-height:34px;font-weight:600;color:#000;">Willkommen bei Powerbook</h1>
                    </td>
                  </tr>

                  <tr>
                    <td style="padding:0 40px 22px 40px;text-align:center;">
                      <p style="margin:0;font-size:15px;color:#333;line-height:22px;">
                        Hallo ${firstName || ""}, schön, dass du bei Powerbook dabei bist. Du kannst dich über den Button einloggen und sofort starten.
                      </p>
                    </td>
                  </tr>

                  <tr>
                    <td style="padding:18px 40px 34px 40px;" align="center">
                      <a href="${loginUrl}" target="_blank" style="display:inline-block;padding:12px 20px;border-radius:6px;background:#000;color:#fff;text-decoration:none;font-weight:600;">
                        Account öffnen
                      </a>
                    </td>
                  </tr>

                  <tr>
                    <td style="padding:0 40px 22px 40px;text-align:center;">
                      <p style="margin:0;font-size:13px;color:#666;line-height:20px;">
                        Wenn du Hilfe brauchst, kontaktiere unseren Support über support@powerbook.at
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
              </td>
            </tr>
          </table>
        </body>
      </html>
    `;

    // Senden (nicht blockierend für Fehler im Ablauf — catch falls Fehler)
    await sendMail({
      to: email,
      subject: "Willkommen bei Powerbook",
      html: welcomeHtml,
    });
  } catch (e) {
    console.error("Fehler beim Senden der Willkommens-E-Mail:", e);
    // wir verändern die Response nicht — Logging reicht
  }

  const res = NextResponse.json({ user: safeUser }, { status: 201 });
  res.cookies.set(SESSION_COOKIE_NAME, token, cookieOptions());
  return res;
}
