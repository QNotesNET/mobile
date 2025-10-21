// lib/google-calendar.ts
/* eslint-disable @typescript-eslint/no-explicit-any */
import { Types } from "mongoose";
import { Calendar } from "@/models/Calendar";
import { CalendarEvent } from "@/models/CalendarEvent";
import { getPrimaryGoogleCalendarId, upsertLocalFromGoogleEvent } from "@/lib/google-calendar-helpers";
import { googleFetch } from "@/lib/google-api";
import connectToDB from "@/lib/mongoose";

export async function ensureLocalGoogleCalendar(userId: string) {
  await connectToDB();
  let cal = await Calendar.findOne({ userId, name: "Google Kalender" }).lean();
  if (cal) return cal;
  const now = new Date();
  const doc = await Calendar.create({
    name: "Google Kalender",
    color: "#000000",
    userId: new Types.ObjectId(userId),
    isDefault: false,
    createdAt: now,
    updatedAt: now,
  });
  return doc.toObject();
}

export async function initialImportGoogleEvents(userId: string, localCalendarId: string) {
  // Initial: hole Events für die nächsten ~365 Tage (oder breiter, wenn du willst)
  const { id: gcalId } = await getPrimaryGoogleCalendarId(userId);
  const timeMin = new Date();
  timeMin.setMonth(timeMin.getMonth() - 3); // auch letzte 90 Tage mitnehmen
  const timeMax = new Date();
  timeMax.setFullYear(timeMax.getFullYear() + 1);

  let url =
    `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(gcalId)}/events` +
    `?singleEvents=true&showDeleted=true&maxResults=2500` +
    `&timeMin=${encodeURIComponent(timeMin.toISOString())}` +
    `&timeMax=${encodeURIComponent(timeMax.toISOString())}`;

  let total = 0;
  for (;;) {
    const data: any = await googleFetch(userId, url);
    const items: any[] = data.items || [];
    for (const g of items) {
      const r = await upsertLocalFromGoogleEvent(userId, localCalendarId, { ...g, calendarId: gcalId });
      if (r.action !== "noop" && r.action !== "skip_local_newer") total++;
    }
    if (!data.nextPageToken) break;
    url =
      `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(gcalId)}/events` +
      `?singleEvents=true&showDeleted=true&maxResults=2500&pageToken=${encodeURIComponent(data.nextPageToken)}` +
      `&timeMin=${encodeURIComponent(timeMin.toISOString())}` +
      `&timeMax=${encodeURIComponent(timeMax.toISOString())}`;
  }

  return { importedOrUpdated: total };
}
