import { NextResponse } from "next/server";
import { connectToDB } from "@/lib/mongoose";
import User from "@/models/User";

// Falls du bereits so etwas hast, nutze es stattdessen:
import { getCurrentUser } from "@/lib/session"; // muss userId/email liefern

export const runtime = "nodejs";

type SessionUser = { id: string } | null;

async function requireUser(): Promise<SessionUser> {
  // Anpassbar: hier deine Session-Lösung verwenden
  const me = await getCurrentUser(); // { id: string } | null
  return me;
}

// GET: aktuelle Nexoro-Felder des eingeloggten Users
export async function GET() {
  try {
    const me = await requireUser();
    if (!me?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await connectToDB();
    const u = await User.findById(me.id)
      .select({ nexoroUser: 1, nexoroDomain: 1 })
      .lean<{ nexoroUser?: string; nexoroDomain?: string } | null>();

    if (!u) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    return NextResponse.json({
      nexoroUser: u.nexoroUser ?? "",
      nexoroDomain: u.nexoroDomain ?? "",
    });
  } catch (err) {
    console.error("[GET /api/settings/nexoro]", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

// PUT: Nexoro-Felder setzen/ändern
export async function PUT(req: Request) {
  try {
    const me = await requireUser();
    if (!me?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { nexoroUser, nexoroDomain } = (await req.json()) as {
      nexoroUser?: string;
      nexoroDomain?: string;
    };

    const user = (nexoroUser || "").trim();
    const domain = (nexoroDomain || "").trim();

    if (!user || !domain) {
      return NextResponse.json(
        { error: "nexoroUser und nexoroDomain sind erforderlich." },
        { status: 400 }
      );
    }

    await connectToDB();
    await User.updateOne(
      { _id: me.id },
      { $set: { nexoroUser: user, nexoroDomain: domain } }
    );

    return NextResponse.json({ nexoroUser: user, nexoroDomain: domain });
  } catch (err) {
    console.error("[PUT /api/settings/nexoro]", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
