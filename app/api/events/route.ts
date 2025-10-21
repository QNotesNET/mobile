/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextResponse } from "next/server";
import { Types } from "mongoose";
import { connectToDB } from "@/lib/mongoose";
import { CalendarEvent } from "@/models/CalendarEvent";
import { Calendar } from "@/models/Calendar";
import { googleFetch } from "@/lib/google-api";
import { getPrimaryGoogleCalendarId, mapLocalToGoogleEventBody } from "@/lib/google-calendar-helpers";

export async function GET(req: Request) {
  await connectToDB();
  const { searchParams } = new URL(req.url);
  const userId = searchParams.get("userId");
  const timeMin = searchParams.get("timeMin");
  const timeMax = searchParams.get("timeMax");
  const calendars = searchParams.getAll("calendarId");
  if (!userId || !Types.ObjectId.isValid(userId))
    return NextResponse.json({ error: "userId required" }, { status: 400 });

  const filter: any = { userId };
  if (timeMin || timeMax) filter.start = {};
  if (timeMin) filter.start.$gte = new Date(timeMin as string);
  if (timeMax) filter.start.$lte = new Date(timeMax as string);
  if (calendars.length > 0)
    filter.calendarId = {
      $in: calendars
        .filter((c) => Types.ObjectId.isValid(c))
        .map((c) => new Types.ObjectId(c)),
    };

  const items = await CalendarEvent.find(filter).sort({ start: 1 }).lean();
  return NextResponse.json({ items });
}

export async function POST(req: Request) {
  await connectToDB();
  const body = await req.json();
  const {
    title,
    description = "",
    location = "",
    start,
    end,
    allDay = false,
    calendarId,
    userId,
  } = body || {};
  if (!title || !start || !end || !calendarId || !userId)
    return NextResponse.json({ error: "missing fields" }, { status: 400 });

  const cal = await Calendar.findOne({ _id: calendarId, userId }).lean();
  if (!cal)
    return NextResponse.json({ error: "calendar not found" }, { status: 404 });

  const now = new Date();
  const doc = await CalendarEvent.create({
    title: String(title).trim(),
    description,
    location,
    start: new Date(start),
    end: new Date(end),
    allDay: !!allDay,
    calendarId,
    userId,
    // Mapping: wenn in Google-Kalender, markieren wir direkt als „google“
    source: cal.name === "Google Kalender" ? "google" : "local",
    createdAt: now,
    updatedAt: now,
  });

  // Mirroring zu Google, wenn „Google Kalender“
  try {
    if (cal.name === "Google Kalender") {
      const { id: gcalId } = await getPrimaryGoogleCalendarId(userId);
      const gEvent = await googleFetch(
        userId,
        `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(gcalId)}/events`,
        { method: "POST", body: JSON.stringify(mapLocalToGoogleEventBody(doc.toObject())) }
      );
      await CalendarEvent.findByIdAndUpdate(doc._id, {
        source: "google",
        sourceId: gEvent.id,
        sourceCalendarId: gcalId,
        sourceEtag: gEvent.etag || null,
        sourceUpdatedAt: gEvent.updated ? new Date(gEvent.updated) : new Date(),
      });
    }
  } catch (e) {
    console.warn("Google Calendar mirror create failed (non-fatal):", e);
  }

  return NextResponse.json(doc.toObject(), { status: 201 });
}
