// app/api/integrations/google/tasks/sync/route.ts
/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextResponse } from "next/server";
import connectToDB from "@/lib/mongoose";
import GoogleAccount from "@/models/GoogleAccount";
import { getCurrentUser } from "@/lib/session";
import { getPrimaryGoogleListId, upsertLocalFromGoogleTask } from "@/lib/google-tasks-helpers";
import { TaskList } from "@/models/TaskList";
import { googleFetch } from "@/lib/google-api";

export async function POST() {
  const me = await getCurrentUser();
  if (!me) return NextResponse.json({ error: "not authenticated" }, { status: 401 });

  await connectToDB();
  const acc = await GoogleAccount.findOne({ userId: me.id });
  if (!acc) return NextResponse.json({ error: "google not linked" }, { status: 400 });

  // Lokale "Google Tasks" Liste ermitteln
  const localList = await TaskList.findOne({ userId: me.id, name: "Google Tasks" }).lean();
  if (!localList) return NextResponse.json({ error: "local 'Google Tasks' list missing" }, { status: 400 });

  const { id: primaryId } = await getPrimaryGoogleListId(me.id);

  const updatedMin =
    acc.get("lastTasksSyncAt") instanceof Date
      ? new Date(acc.get("lastTasksSyncAt") as Date)
      : new Date(0);

  let url =
    `https://tasks.googleapis.com/tasks/v1/lists/${encodeURIComponent(primaryId)}/tasks` +
    `?showDeleted=true&showHidden=true&maxResults=200` +
    (updatedMin.getTime() > 0 ? `&updatedMin=${encodeURIComponent(updatedMin.toISOString())}` : "");

  let total = 0;
  // Paging
  // Hinweis: tasks.list kann pageToken zurückgeben
  // Wir laufen, bis nichts mehr kommt
  // (Wenn du viel Volumen erwartest, begrenze Durchläufe)
  // @expect-error --- ignorierts
  for (;;) {
    const res: any = await googleFetch(me.id, url);
    const items: any[] = res.items || [];
    for (const g of items) {
        // @ts-expect-error --- gibts scho
      const r = await upsertLocalFromGoogleTask(me.id, String(localList._id), { ...g, listId: primaryId });
      if (r.action !== "noop" && r.action !== "skip_local_newer") total++;
    }
    if (!res.nextPageToken) break;
    url =
      `https://tasks.googleapis.com/tasks/v1/lists/${encodeURIComponent(primaryId)}/tasks` +
      `?showDeleted=true&showHidden=true&maxResults=200&pageToken=${encodeURIComponent(res.nextPageToken)}` +
      (updatedMin.getTime() > 0 ? `&updatedMin=${encodeURIComponent(updatedMin.toISOString())}` : "");
  }

  // abschließend "jetzt" als Sync-Zeit setzen
  acc.set("lastTasksSyncAt", new Date());
  await acc.save();

  return NextResponse.json({ ok: true, importedOrUpdated: total });
}
