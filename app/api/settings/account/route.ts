// app/api/settings/account/route.ts
import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { Types } from "mongoose";
import connectToDB from "@/lib/mongoose";
import User from "@/models/User";
import { getCurrentUser } from "@/lib/session";
import { SignJWT } from "jose";

function isValidEmail(val: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val);
}

// kleine Hilfe: "7d" -> Sekunden (nur für Cookie maxAge); bei unbekanntem Format: 7 Tage
function ttlSecondsFrom(envVal: string | undefined): number {
  if (!envVal) return 60 * 60 * 24 * 7;
  const m = envVal.match(/^(\d+)([smhd])$/i);
  if (!m) return 60 * 60 * 24 * 7;
  const n = parseInt(m[1], 10);
  const unit = m[2].toLowerCase();
  const mult = unit === "s" ? 1 : unit === "m" ? 60 : unit === "h" ? 3600 : 86400;
  return n * mult;
}

async function issueSessionJWT(payload: { id: string; email: string; role?: string }) {
  const secret = new TextEncoder().encode(process.env.JWT_SECRET || "dev-secret");
  const jwtExpires = process.env.JWT_EXPIRES || "7d"; // z.B. "7d"

  const token = await new SignJWT({ email: payload.email, role: payload.role })
    .setProtectedHeader({ alg: "HS256", typ: "JWT" })
    .setSubject(payload.id)
    .setIssuedAt()
    .setExpirationTime(jwtExpires)
    .sign(secret);

  const cookieStore = await cookies();
  cookieStore.set("qnotes_session", token, {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    path: "/",
    maxAge: ttlSecondsFrom(jwtExpires),
  });

  return token;
}

export async function GET() {
  try {
    const me = await getCurrentUser();
    if (!me?.id) return NextResponse.json({ email: "" }, { status: 200 });

    await connectToDB();
    const doc = await User.findById(new Types.ObjectId(me.id)).select({ email: 1 }).lean();
    return NextResponse.json({ email: doc?.email ?? "" });
  } catch {
    return new NextResponse("Failed to load account", { status: 500 });
  }
}

export async function PUT(req: Request) {
  try {
    const me = await getCurrentUser();
    if (!me?.id) return new NextResponse("Unauthorized", { status: 401 });

    const body = await req.json();
    const email = String(body?.email ?? "").trim().toLowerCase();
    if (!isValidEmail(email)) return new NextResponse("Invalid email", { status: 400 });

    await connectToDB();

    // E-Mail darf nicht von jemand anderem belegt sein
    const conflict = await User.findOne({
      email,
      _id: { $ne: new Types.ObjectId(me.id) },
    })
      .select({ _id: 1 })
      .lean();
    if (conflict) return new NextResponse("Email already in use", { status: 409 });

    // speichern
    const updated = await User.findByIdAndUpdate(
      new Types.ObjectId(me.id),
      { email },
      { new: true, runValidators: true },
    ).select({ email: 1, role: 1 });

    // Session sofort refreshen
    await issueSessionJWT({
      id: me.id,
      email: updated?.email ?? email,
      role: updated?.role ?? me.role,
    });

    return NextResponse.json({ ok: true, email: updated?.email ?? email });
  } catch {
    return new NextResponse("Failed to update account", { status: 500 });
  }
}
