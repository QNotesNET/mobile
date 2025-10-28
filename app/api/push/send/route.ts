// app/api/push/send/route.ts
import { NextResponse } from "next/server";
import connectToDB from "@/lib/mongoose";
import User from "@/models/User";
import { getCurrentUser } from "@/lib/session";
import { Expo } from "expo-server-sdk";

const expo = new Expo({
  accessToken: process.env.EXPO_ACCESS_TOKEN || undefined,
});

export async function POST(req: Request) {
  try {
    await connectToDB();

    // 🧑‍💼 Nur Admins dürfen senden
    const me = await getCurrentUser();
    if (!me || me.role !== "admin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // 📦 Body parsen
    const { userId, title, body } = await req.json();
    if (!userId || !title || !body) {
      return NextResponse.json({ error: "Missing fields" }, { status: 400 });
    }

    // 👤 User + Token holen
    const user = await User.findById(userId);
    if (!user || !user.expoPushToken) {
      return NextResponse.json(
        { error: "User has no push token" },
        { status: 404 }
      );
    }

    // 🚀 Push-Nachricht vorbereiten
    const pushMessages = [
      {
        to: user.expoPushToken,
        sound: "default",
        title,
        body,
        data: {
          from: "powerbook-admin",
          userId: String(userId),
          sentAt: new Date().toISOString(),
        },
      },
    ];

    // ✅ Nur gültige Tokens akzeptieren
    const validMessages = pushMessages.filter((m) =>
      Expo.isExpoPushToken(m.to)
    );

    if (validMessages.length === 0) {
      return NextResponse.json(
        { error: "Invalid Expo push token format" },
        { status: 400 }
      );
    }

    // 📤 Push senden
    const receipts = await expo.sendPushNotificationsAsync(validMessages);

    console.log(
      `[PushSent] → ${user.email} (${user._id}) :: ${title} / ${body}`
    );

    return NextResponse.json({
      success: true,
      receipts,
    });
  } catch (err) {
    console.error("[PushSendError]", err);
    return NextResponse.json({ error: "Failed to send push" }, { status: 500 });
  }
}
