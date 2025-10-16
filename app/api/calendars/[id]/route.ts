/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextResponse } from "next/server";
import { Types } from "mongoose";
import { connectToDB } from "@/lib/mongoose";
import { Calendar } from "@/models/Calendar";
import { CalendarEvent } from "@/models/CalendarEvent";

export async function PATCH(req: Request, ctx: any) {
  await connectToDB();
  const id = ctx.params.id as string;
  const body = await req.json();
  const update: any = { updatedAt: new Date() };
  if (typeof body.name === "string") update.name = body.name.trim();
  if (typeof body.color === "string") update.color = body.color;
  if (typeof body.isDefault === "boolean" && body.isDefault) {
    const cal = await Calendar.findById(id).lean();
    if (cal)
      await Calendar.updateMany(
        { userId: cal.userId },
        { $set: { isDefault: false } }
      );
    update.isDefault = true;
  }
  const doc = await Calendar.findByIdAndUpdate(id, update, {
    new: true,
  }).lean();
  if (!doc) return NextResponse.json({ error: "not found" }, { status: 404 });
  return NextResponse.json(doc);
}

export async function DELETE(_req: Request, ctx: any) {
  await connectToDB();
  const id = ctx.params.id as string;
  if (!Types.ObjectId.isValid(id))
    return NextResponse.json({ error: "invalid id" }, { status: 400 });
  const cal = await Calendar.findByIdAndDelete(id).lean();
  if (!cal) return NextResponse.json({ error: "not found" }, { status: 404 });
  await CalendarEvent.deleteMany({ calendarId: id });
  return NextResponse.json({ ok: true });
}
