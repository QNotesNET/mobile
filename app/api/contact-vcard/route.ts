// app/api/contact-vcard/route.ts
import { NextResponse } from "next/server";
import Contact from "@/models/Contact";
import connectToDB from "@/lib/mongoose";

export async function GET(req: Request) {
  await connectToDB();
  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  const contact = await Contact.findById(id).lean();
  if (!contact)
    return NextResponse.json({ error: "Not found" }, { status: 404 });

  const lines = [
    "BEGIN:VCARD",
    "VERSION:3.0",
    `FN:${contact.firstName || ""} ${contact.lastName || ""}`,
    contact.phone ? `TEL;TYPE=CELL:${contact.phone}` : "",
    contact.email ? `EMAIL:${contact.email}` : "",
    contact.company ? `ORG:${contact.company}` : "",
    contact.position ? `TITLE:${contact.position}` : "",
    contact.street || contact.city || contact.country
      ? `ADR;TYPE=home:;;${contact.street || ""};${contact.city || ""};;${
          contact.postalCode || ""
        };${contact.country || ""}`
      : "",
    "END:VCARD",
  ]
    .filter(Boolean)
    .join("\n");

  const res = new NextResponse(lines, {
    status: 200,
    headers: {
      "Content-Type": "text/vcard; charset=utf-8",
      "Content-Disposition": `attachment; filename="${
        contact.firstName || "contact"
      }_${contact.lastName || ""}.vcf"`,
    },
  });
  return res;
}
