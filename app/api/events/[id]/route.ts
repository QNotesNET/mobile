/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextResponse } from "next/server";
import { connectToDB } from "@/lib/mongoose";
import { CalendarEvent } from "@/models/CalendarEvent";
import { Calendar } from "@/models/Calendar";
import { Types } from "mongoose";
import { googleFetch } from "@/lib/google-api";
import { getPrimaryGoogleCalendarId, mapLocalToGoogleEventBody } from "@/lib/google-calendar-helpers";

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

  const prev = await CalendarEvent.findById(id).lean();
  if (!prev) return NextResponse.json({ error: "not found" }, { status: 404 });

  const patch: any = { updatedAt: new Date() };
  if (typeof body.title === "string") patch.title = body.title.trim();
  if (typeof body.description === "string") patch.description = body.description;
  if (typeof body.location === "string") patch.location = body.location;
  if (typeof body.allDay === "boolean") patch.allDay = body.allDay;
  if (body.start) patch.start = new Date(body.start);
  if (body.end) patch.end = new Date(body.end);

  let movedIntoGoogle = false;
  let movedOutOfGoogle = false;

  if (body.calendarId) {
    if (!Types.ObjectId.isValid(body.calendarId))
      return NextResponse.json({ error: "invalid calendarId" }, { status: 400 });
    const newCal = await Calendar.findById(body.calendarId).lean();
    if (!newCal) return NextResponse.json({ error: "calendar not found" }, { status: 404 });
    patch.calendarId = body.calendarId;

    const wasGoogle = prev.source === "google";
    const isGoogle = newCal.name === "Google Kalender";
    movedIntoGoogle = !wasGoogle && isGoogle;
    movedOutOfGoogle = wasGoogle && !isGoogle;
  }

  const updated = await CalendarEvent.findByIdAndUpdate(id, patch, { new: true }).lean();
  if (!updated) return NextResponse.json({ error: "not found" }, { status: 404 });

  try {
    if (movedIntoGoogle) {
      const { id: gcalId } = await getPrimaryGoogleCalendarId(String(updated.userId));
      const gEvent = await googleFetch(
        String(updated.userId),
        `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(gcalId)}/events`,
        { method: "POST", body: JSON.stringify(mapLocalToGoogleEventBody(updated)) }
      );
      await CalendarEvent.findByIdAndUpdate(updated._id, {
        source: "google",
        sourceId: gEvent.id,
        sourceCalendarId: gcalId,
        sourceEtag: gEvent.etag || null,
        sourceUpdatedAt: gEvent.updated ? new Date(gEvent.updated) : new Date(),
      });
    } else if (movedOutOfGoogle) {
      if (prev.sourceId && prev.sourceCalendarId) {
        await googleFetch(
          String(updated.userId),
          `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(prev.sourceCalendarId)}/events/${encodeURIComponent(prev.sourceId)}`,
          { method: "DELETE" }
        );
      }
      await CalendarEvent.findByIdAndUpdate(updated._id, {
        source: "local",
        sourceId: null,
        sourceCalendarId: null,
        sourceEtag: null,
        sourceUpdatedAt: null,
      });
    } else {
      const isGoogleEvent = (prev.source === "google") || (updated.source === "google");
      if (isGoogleEvent) {
        const calId = String(prev.sourceCalendarId || updated.sourceCalendarId);
        const evId = String(prev.sourceId || updated.sourceId);
        const gEvent = await googleFetch(
          String(updated.userId),
          `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calId)}/events/${encodeURIComponent(evId)}`,
          { method: "PATCH", body: JSON.stringify(mapLocalToGoogleEventBody(updated)) }
        );
        await CalendarEvent.findByIdAndUpdate(updated._id, {
          sourceEtag: gEvent.etag || null,
          sourceUpdatedAt: gEvent.updated ? new Date(gEvent.updated) : new Date(),
        });
      }
    }
  } catch (e) {
    console.warn("Google Calendar mirror PATCH failed (non-fatal):", e);
  }

  return NextResponse.json(await CalendarEvent.findById(id).lean());
}

export async function DELETE(_req: Request, ctx: any) {
  await connectToDB();
  const id = ctx.params.id as string;
  const prev = await CalendarEvent.findById(id).lean();
  if (!prev) return NextResponse.json({ error: "not found" }, { status: 404 });

  try {
    if (prev.source === "google" && prev.sourceId && prev.sourceCalendarId) {
      await googleFetch(
        String(prev.userId),
        `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(prev.sourceCalendarId)}/events/${encodeURIComponent(prev.sourceId)}`,
        { method: "DELETE" }
      );
    }
  } catch (e) {
    console.warn("Google Calendar mirror DELETE failed (non-fatal):", e);
  }

  await CalendarEvent.findByIdAndDelete(id).lean();
  return NextResponse.json({ ok: true });
}
