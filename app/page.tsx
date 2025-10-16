import AppShell from "@/components/AppShell";
import { getCurrentUser } from "@/lib/session";

import connectToDB from "@/lib/mongoose";
import Notebook, { type NotebookDoc } from "@/models/Notebook";
import Page from "@/models/PageModel";
import DashboardClient from "./DashboardClient";
import { Types } from "mongoose";

type NotebookCard = {
  id: string;
  title: string;
  pages: number;        // gescannt (images.0 existiert)
  totalPages: number;   // alle Seiten des Notizbuchs
  lastUpdated: string;
  completion: number;   // pages / totalPages * 100
  color: string;
};

type NotebookWithTimestamps = NotebookDoc & {
  createdAt?: Date;
  updatedAt?: Date;
  color?: string;
};

type PageAgg = {
  _id: Types.ObjectId;
  totalPages: number;
  scannedPages: number;
  lastPageUpdatedAt?: Date;
};

function formatRelative(date: Date): string {
  const diffMs = Date.now() - date.getTime();
  const minutes = Math.floor(diffMs / 60000);
  if (minutes < 1) return "Gerade eben";
  if (minutes < 60) return `vor ${minutes} Min`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `vor ${hours} Std`;
  const days = Math.floor(hours / 24);
  if (days === 1) return "Gestern";
  return date.toLocaleDateString("de-AT");
}

export default async function DashboardPage() {
  const user = await getCurrentUser();

  const email = user?.email ?? "—";
  const firstName = (() => {
    if (!user?.email) return "Gast";
    const local = user.email.split("@")[0];
    const part = local.split(/[._-]/)[0] || local;
    return part.charAt(0).toUpperCase() + part.slice(1);
  })();

  let notebookCount = 0;
  let pagesTotal = 0; // global gescannte Seiten
  let notebooks: NotebookCard[] = [];

  const userObjectId = user?.id ? new Types.ObjectId(user.id) : null;

  if (userObjectId) {
    await connectToDB();

    // Notizbücher des Users (hydrated Docs → streng typisierbar)
    const nbs = (await Notebook.find({ ownerId: userObjectId })
      .sort({ updatedAt: -1 })
      .exec()) as NotebookWithTimestamps[];

    notebookCount = nbs.length;

    if (notebookCount > 0) {
      const nbIds = nbs.map((n) => n._id);

      // globale gescannte Seiten: pages mit mind. 1 image
      pagesTotal = await Page.countDocuments({
        notebookId: { $in: nbIds },
        "images.0": { $exists: true },
      });

      // pro Notebook: total/scanned/letzte Änderung
      const perNotebook = await Page.aggregate<PageAgg>([
        { $match: { notebookId: { $in: nbIds } } },
        {
          $project: {
            notebookId: 1,
            updatedAt: 1,
            hasImage: { $gt: [{ $size: { $ifNull: ["$images", []] } }, 0] },
          },
        },
        {
          $group: {
            _id: "$notebookId",
            totalPages: { $sum: 1 },
            scannedPages: { $sum: { $cond: ["$hasImage", 1, 0] } },
            lastPageUpdatedAt: { $max: "$updatedAt" },
          },
        },
      ]);

      const statsByNb = new Map<string, PageAgg>();
      perNotebook.forEach((s) => statsByNb.set(String(s._id), s));

      const fallbackColors = ["bg-emerald-500", "bg-indigo-500", "bg-amber-500", "bg-rose-500"];

      notebooks = nbs.slice(0, 4).map<NotebookCard>((n, i) => {
        const stat = statsByNb.get(String(n._id));
        const total = stat?.totalPages ?? 0;
        const scanned = stat?.scannedPages ?? 0;

        const lastUpdatedDate =
          stat?.lastPageUpdatedAt ?? n.updatedAt ?? n.createdAt ?? new Date();

        const completion = total > 0 ? Math.round((scanned / total) * 100) : 0;

        return {
          id: String(n._id),
          title: n.title ?? "Unbenanntes Notizbuch",
          pages: scanned,
          totalPages: total,
          lastUpdated: formatRelative(new Date(lastUpdatedDate)),
          completion: Math.max(0, Math.min(100, completion)),
          color: n.color ?? fallbackColors[i % fallbackColors.length],
        };
      });
    }
  }

  return (
    <AppShell>
      <DashboardClient
        userName={firstName}
        userEmail={email}
        notebookCount={notebookCount}
        pagesTotal={pagesTotal}
        notebooks={notebooks}
      />
    </AppShell>
  );
}
