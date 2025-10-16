/* eslint-disable @typescript-eslint/no-explicit-any */
import { getCurrentUser } from "@/lib/session";
import { connectToDB } from "@/lib/mongoose";
import { Calendar } from "@/models/Calendar";
import CalendarBoard from "@/components/calendar/CalendarBoard";
import { Types } from "mongoose";

export const dynamic = "force-dynamic";

export default async function Page() {
  const user = await getCurrentUser();
  if (!user) return null;

  await connectToDB();

  const userObjectId = new Types.ObjectId(user.id);

  let calendars = await Calendar.find({ userId: userObjectId })
    .sort({ isDefault: -1, createdAt: 1 })
    .lean();

  if (calendars.length === 0) {
    const created = await Calendar.create({
      name: user.email.split("@")[0],
      color: "#000000",
      userId: userObjectId,
      isDefault: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    // ← WICHTIG: erneut lean lesen, damit der Typ zu `calendars` passt
    const createdLean = await Calendar.findById(created._id).lean();
    calendars = createdLean ? [createdLean] : [];
  }

  const initial = calendars.map((c) => ({
    _id: String(c._id),
    name: c.name as string,
    color: (c as any).color ?? "#000000",
    isDefault: !!(c as any).isDefault,
    userId: String((c as any).userId),
  }));

  return (
    <div className="p-4 md:p-6">
      <CalendarBoard userId={user.id} initialCalendars={initial} />
    </div>
  );
}
