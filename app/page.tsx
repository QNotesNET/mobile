import AppShell from "@/components/AppShell";
import { getCurrentUser } from "@/lib/session";

import connectToDB from "@/lib/mongoose";
import Notebook from "@/models/Notebook";
import Page from "@/models/PageModel";
import DashboardClient from "./DashboardClient";
import { Types } from "mongoose";

type NotebookCard = {
  id: string;
  title: string;
  pages: number;        // GESCANNT (images.0 existiert)
  totalPages: number;   // ALLE Seiten des Notizbuchs
  lastUpdated: string;
  completion: number;   // pages / totalPages * 100
  color: string;
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
  let pagesTotal = 0;            // GESCANNTE Seiten (global)
  let notebooks: NotebookCard[] = [];

  const userObjectId = user?.id ? new Types.ObjectId(user.id) : null;

  if (userObjectId) {
    await connectToDB();

    // Notizbücher des Users
    const nbs = await Notebook.find({ ownerId: userObjectId })
      .sort({ updatedAt: -1 })
      .lean();
    notebookCount = nbs.length;

    if (notebookCount > 0) {
      const nbIds = nbs.map((n) => n._id as Types.ObjectId);

      // Globale gescannte Seiten: mind. 1 Image
      pagesTotal = await Page.countDocuments({
        notebookId: { $in: nbIds },
        "images.0": { $exists: true },
      });

      // Pro-Notebook: total + scanned + letzte Änderung
      const perNotebook = await Page.aggregate([
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

      const statsByNb = new Map<
        string,
        { totalPages: number; scannedPages: number; lastPageUpdatedAt?: Date }
      >();
      perNotebook.forEach((s) => {
        statsByNb.set(String(s._id), {
          totalPages: (s.totalPages as number) ?? 0,
          scannedPages: (s.scannedPages as number) ?? 0,
          lastPageUpdatedAt: (s.lastPageUpdatedAt as Date) ?? undefined,
        });
      });

      const fallbackColors = ["bg-emerald-500", "bg-indigo-500", "bg-amber-500", "bg-rose-500"];

      notebooks = nbs.slice(0, 4).map((n, i) => {
        const key = String(n._id);
        const stat = statsByNb.get(key) ?? { totalPages: 0, scannedPages: 0 };
        const total = stat.totalPages;
        const scanned = stat.scannedPages;

        const lu =
          stat.lastPageUpdatedAt ??
          ((n as any).updatedAt as Date | undefined) ??
          ((n as any).createdAt as Date | undefined) ??
          new Date();

        const completion = total > 0 ? Math.round((scanned / total) * 100) : 0;

        return {
          id: String(n._id),
          title: (n as any).title ?? "Unbenanntes Notizbuch",
          pages: scanned,            // gescannte Seiten
          totalPages: total,         // alle Seiten
          lastUpdated: formatRelative(new Date(lu)),
          completion: Math.max(0, Math.min(100, completion)),
          color: (n as any).color ?? fallbackColors[i % fallbackColors.length],
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
        pagesTotal={pagesTotal}   // „Seiten“ oben: gescannt gesamt
        notebooks={notebooks}
      />
    </AppShell>
  );
}
