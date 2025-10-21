// app/api/integrations/google/status/route.ts
import { NextResponse } from "next/server";
import connectToDB from "@/lib/mongoose";
import GoogleAccount from "@/models/GoogleAccount";
import { getCurrentUser } from "@/lib/session";

export async function GET() {
  const me = await getCurrentUser();
  if (!me) return NextResponse.json({ connected: false });

  await connectToDB();
  const acc = await GoogleAccount.findOne({ userId: me.id }).lean();
  const account = Array.isArray(acc) ? acc[0] : acc;
  return NextResponse.json({
    connected: !!account,
    email: account?.email || null,
  });
}
