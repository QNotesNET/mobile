// lib/email.ts
import type { Transporter } from "nodemailer";
import nodemailer from "nodemailer";

type MailInput = {
  to: string;
  subject: string;
  html: string;
  text?: string;
  from?: string;
};

// SMTP vorhanden?
function smtpConfigured() {
  const { SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS } = process.env;
  return !!(SMTP_HOST && SMTP_PORT && SMTP_USER && SMTP_PASS);
}

let _transporter: Transporter | null = null;

async function getTransporter(): Promise<Transporter | null> {
  if (!smtpConfigured()) return null;
  if (_transporter) return _transporter;

  const host = process.env.SMTP_HOST!;
  const port = Number(process.env.SMTP_PORT || 0);
  const user = process.env.SMTP_USER!;
  const pass = process.env.SMTP_PASS!;
  const secure = port === 465;

  _transporter = nodemailer.createTransport({
    host,
    port,
    secure,
    auth: { user, pass },
  });

  return _transporter;
}

export async function sendMail(input: MailInput) {
  const from = input.from || process.env.MAIL_FROM || "Powerbook <noreply@powerbook.at>";

  const transporter = await getTransporter();
  if (!transporter) {
    // Fallback: Link ins Log schreiben – hilft beim lokalen Testen
    console.log("[MAIL:FAKE]", { ...input, from });
    return;
  }

  await transporter.sendMail({
    from,
    to: input.to,
    subject: input.subject,
    html: input.html,
    text: input.text,
  });
}
