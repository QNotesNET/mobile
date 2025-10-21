// app/api/integrations/google/disconnect/route.ts
import { NextResponse } from "next/server";
import { Types } from "mongoose";
import { connectToDB } from "@/lib/mongoose";
import { getCurrentUser } from "@/lib/session";
import GoogleAccount from "@/models/GoogleAccount";
import { TaskList } from "@/models/TaskList";
import { Task } from "@/models/Task";
import { Calendar } from "@/models/Calendar";
import { CalendarEvent } from "@/models/CalendarEvent";

export async function POST() {
  const me = await getCurrentUser();
  if (!me) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  await connectToDB();

  // 1) GoogleAccount entfernen
  await GoogleAccount.deleteOne({ userId: me.id });

  // 2) Lokale Google Tasks-Liste + Tasks entfernen (nur DB)
  const gList = await TaskList.findOne({
    userId: new Types.ObjectId(me.id),
    name: "Google Tasks",
  }).lean();

  if (gList) {
    await Task.deleteMany({
      userId: new Types.ObjectId(me.id),
      //   @ts-expect-error is do
      listId: new Types.ObjectId(gList._id),
    });
    //   @ts-expect-error is do
    await TaskList.deleteOne({ _id: gList._id });
  }

  // 3) Lokalen "Google Kalender" + Events entfernen (nur DB)
  const gCal = await Calendar.findOne({
    userId: new Types.ObjectId(me.id),
    name: "Google Kalender",
  }).lean();

  if (gCal) {
    await CalendarEvent.deleteMany({
      userId: new Types.ObjectId(me.id),
      calendarId: new Types.ObjectId(gCal._id),
    });
    await Calendar.deleteOne({ _id: gCal._id });
  }

  // (Optional) Token-Revoke bei Google wäre best effort; bewusst weggelassen.

  return NextResponse.json({ ok: true });
}
