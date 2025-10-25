import { NextResponse } from "next/server";
import connectToDB from "@/lib/mongoose";
import Contact from "@/models/Contact";
import { verifySessionJWT, SESSION_COOKIE_NAME } from "@/lib/auth";

async function getUserFromRequest(req: Request) {
  const cookieHeader = req.headers.get("cookie");
  if (!cookieHeader) return null;

  const cookie = cookieHeader
    .split(";")
    .map((x) => x.trim())
    .find((x) => x.startsWith(`${SESSION_COOKIE_NAME}=`));

  if (!cookie) return null;
  const token = cookie.split("=")[1];
  try {
    const user = await verifySessionJWT(token);
    return user;
  } catch {
    return null;
  }
}

export async function DELETE(
  req: Request,
  { params }: { params: { id: string } }
) {
  await connectToDB();
  const user = await getUserFromRequest(req);
  if (!user)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const contact = await Contact.findOneAndDelete({
    _id: params.id,
    userId: user.sub,
  });
  if (!contact)
    return NextResponse.json({ error: "Not found" }, { status: 404 });

  return NextResponse.json({ success: true });
}
