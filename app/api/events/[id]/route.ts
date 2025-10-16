/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextResponse } from "next/server";
import { connectToDB } from "@/lib/mongoose";
import { CalendarEvent } from "@/models/CalendarEvent";
import { Calendar } from "@/models/Calendar";
import { Types } from "mongoose";

export async function GET(_req: Request, ctx: any) {
  await connectToDB();
  const id = ctx.params.id as string;
  const ev = await CalendarEvent.findById(id).lean();
  if (!ev) return NextResponse.json({ error: "not found" }, { status: 404 });
  return NextResponse.json(ev);
}

export async function PATCH(req: Request, ctx: any) {
  await connectToDB();
  const id = ctx.params.id as string;
  const body = await req.json();
  const patch: any = { updatedAt: new Date() };
  if (typeof body.title === "string") patch.title = body.title.trim();
  if (typeof body.description === "string")
    patch.description = body.description;
  if (typeof body.location === "string") patch.location = body.location;
  if (typeof body.allDay === "boolean") patch.allDay = body.allDay;
  if (body.start) patch.start = new Date(body.start);
  if (body.end) patch.end = new Date(body.end);
  if (body.calendarId) {
    if (!Types.ObjectId.isValid(body.calendarId))
      return NextResponse.json(
        { error: "invalid calendarId" },
        { status: 400 }
      );
    const exists = await Calendar.exists({ _id: body.calendarId });
    if (!exists)
      return NextResponse.json(
        { error: "calendar not found" },
        { status: 404 }
      );
    patch.calendarId = body.calendarId;
  }
  const ev = await CalendarEvent.findByIdAndUpdate(id, patch, {
    new: true,
  }).lean();
  if (!ev) return NextResponse.json({ error: "not found" }, { status: 404 });
  return NextResponse.json(ev);
}

export async function DELETE(_req: Request, ctx: any) {
  await connectToDB();
  const id = ctx.params.id as string;
  const ev = await CalendarEvent.findByIdAndDelete(id).lean();
  if (!ev) return NextResponse.json({ error: "not found" }, { status: 404 });
  return NextResponse.json({ ok: true });
}
