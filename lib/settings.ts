// lib/settings.ts
import connectToDB from "@/lib/mongoose";
import Setting, { type SettingDoc } from "@/models/Settings";

export type SettingsPayload = {
  vision: { model: string; resolution: string; prompt: string };
  pageDetect: { model: string; resolution: string; prompt: string };
};

/** Für serverseitige Routen/Jobs – ohne API roundtrip */
export async function getSettings(): Promise<SettingsPayload> {
  await connectToDB();
  const doc = (await Setting.findOne({ key: "global" }).lean<SettingDoc>()) ?? null;

  const fallback = {
    vision: { model: "gpt-4o-mini", resolution: "low", prompt: "" },
    pageDetect: { model: "gpt-4o-mini", resolution: "low", prompt: "" },
  };

  if (!doc) return fallback;

  return {
    vision: {
      model: doc.vision?.model || fallback.vision.model,
      resolution: doc.vision?.resolution || fallback.vision.resolution,
      prompt: doc.vision?.prompt || fallback.vision.prompt,
    },
    pageDetect: {
      model: doc.pageDetect?.model || fallback.pageDetect.model,
      resolution: doc.pageDetect?.resolution || fallback.pageDetect.resolution,
      prompt: doc.pageDetect?.prompt || fallback.pageDetect.prompt,
    },
  };
}
