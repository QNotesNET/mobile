// lib/google-calendar-helpers.ts
/* eslint-disable @typescript-eslint/no-explicit-any */
import { Types } from "mongoose";
import { googleFetch } from "@/lib/google-api";
import { CalendarEvent } from "@/models/CalendarEvent";

export async function getPrimaryGoogleCalendarId(userId: string) {
  // "primary" ist i.d.R. korrekt, aber wir holen sicherheitshalber die ID
  const me = await googleFetch(userId, "https://www.googleapis.com/calendar/v3/users/me/calendarList");
  const primary = (me.items || []).find((c: any) => c.primary) || (me.items || [])[0];
  if (!primary) throw new Error("No Google calendars found");
  return { id: String(primary.id), summary: String(primary.summary || "primary") };
}

export function mapLocalToGoogleEventBody(local: any) {
  // allDay-Events → date, sonst dateTime
  const start = local.allDay
    ? { date: new Date(local.start).toISOString().slice(0,10) }
    : { dateTime: new Date(local.start).toISOString() };
  const end = local.allDay
    ? { date: new Date(local.end).toISOString().slice(0,10) }
    : { dateTime: new Date(local.end).toISOString() };

  return {
    summary: local.title || "",
    description: local.description || "",
    location: local.location || "",
    start,
    end,
  };
}

export async function upsertLocalFromGoogleEvent(
  userId: string,
  localCalendarId: string, // _id des lokalen "Google Kalender"
  g: any
) {
  // g ist ein Google Event
  const sourceId = String(g.id);
  const sourceCalendarId = String(g.organizer?.email || g.calendarId || "primary");
  const title = (g.summary || "(Ohne Titel)").slice(0, 300);
  const description = String(g.description || "");
  const location = String(g.location || "");

  // Zeitlogik: allDay wenn Felder "date" gesetzt sind
  const gStart = g.start?.dateTime || g.start?.date;
  const gEnd = g.end?.dateTime || g.end?.date;
  const allDay = Boolean(g.start?.date && g.end?.date);

  const start = gStart ? new Date(gStart) : new Date();
  const end = gEnd ? new Date(gEnd) : new Date(start.getTime() + 60*60*1000);

  const sourceUpdatedAt = g.updated ? new Date(g.updated) : new Date();

  const existing = await CalendarEvent.findOne({ userId, source: "google", sourceId }).lean();

  if (g.status === "cancelled") {
    if (existing) await CalendarEvent.findByIdAndDelete(existing._id);
    return { action: existing ? "deleted" : "noop" };
  }

  if (!existing) {
    const now = new Date();
    await CalendarEvent.create({
      title, description, location,
      start, end, allDay,
      calendarId: new Types.ObjectId(localCalendarId),
      userId: new Types.ObjectId(userId),
      source: "google",
      sourceId,
      sourceCalendarId,
      sourceEtag: g.etag || null,
      sourceUpdatedAt,
      createdAt: now,
      updatedAt: now,
    });
    return { action: "created" };
  }

  // Ping-Pong vermeiden: update nur, wenn Google neuer ist
  const localIsNewer =
    existing.sourceUpdatedAt && existing.updatedAt &&
    new Date(existing.updatedAt).getTime() > new Date(sourceUpdatedAt).getTime();

  if (localIsNewer) return { action: "skip_local_newer" };

  await CalendarEvent.findByIdAndUpdate(existing._id, {
    title, description, location, start, end, allDay,
    sourceEtag: g.etag || null,
    sourceUpdatedAt,
    updatedAt: new Date(),
  });

  return { action: "updated" };
}
