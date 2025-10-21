// app/api/integrations/google/calendar/sync/route.ts
/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextResponse } from "next/server";
import connectToDB from "@/lib/mongoose";
import GoogleAccount from "@/models/GoogleAccount";
import { getCurrentUser } from "@/lib/session";
import { Calendar } from "@/models/Calendar";
import { getPrimaryGoogleCalendarId, upsertLocalFromGoogleEvent } from "@/lib/google-calendar-helpers";
import { googleFetch } from "@/lib/google-api";

export async function POST() {
  const me = await getCurrentUser();
  if (!me) return NextResponse.json({ error: "not authenticated" }, { status: 401 });

  await connectToDB();
  const acc = await GoogleAccount.findOne({ userId: me.id });
  if (!acc) return NextResponse.json({ error: "google not linked" }, { status: 400 });

  const localCal = await Calendar.findOne({ userId: me.id, name: "Google Kalender" }).lean();
  if (!localCal) return NextResponse.json({ error: "local 'Google Kalender' missing" }, { status: 400 });

  const { id: gcalId } = await getPrimaryGoogleCalendarId(me.id);

  // syncToken vorhanden? → inkrementelles Delta
  const syncToken: string | undefined = (acc as any).lastCalendarSyncToken || undefined;

  let url =
    `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(gcalId)}/events` +
    `?singleEvents=true&showDeleted=true&maxResults=2500` +
    (syncToken ? `&syncToken=${encodeURIComponent(syncToken)}` : `&timeMin=${encodeURIComponent(new Date(Date.now()-90*86400e3).toISOString())}`);

  let total = 0;
  for (;;) {
    const data: any = await googleFetch(me.id, url);
    const items: any[] = data.items || [];
    for (const g of items) {
      const r = await upsertLocalFromGoogleEvent(me.id, String(localCal._id), { ...g, calendarId: gcalId });
      if (r.action !== "noop" && r.action !== "skip_local_newer") total++;
    }

    // syncToken wird entweder direkt geliefert oder nach letzter Seite als nextSyncToken
    if (data.nextPageToken) {
      url =
        `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(gcalId)}/events` +
        `?singleEvents=true&showDeleted=true&maxResults=2500&pageToken=${encodeURIComponent(data.nextPageToken)}` +
        (syncToken ? `&syncToken=${encodeURIComponent(syncToken)}` : `&timeMin=${encodeURIComponent(new Date(Date.now()-90*86400e3).toISOString())}`);
    } else {
      const newToken = data.nextSyncToken || data.syncToken;
      if (newToken) {
        (acc as any).lastCalendarSyncToken = newToken;
        (acc as any).lastCalendarSyncAt = new Date();
        await acc.save();
      }
      break;
    }
  }

  return NextResponse.json({ ok: true, importedOrUpdated: total });
}
