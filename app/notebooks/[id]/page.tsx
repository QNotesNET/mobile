// app/notebooks/[id]/page.tsx
import { notFound } from "next/navigation";
import { Types } from "mongoose";
import { connectToDB } from "@/lib/mongoose";
import Notebook from "@/models/Notebook";
import Page from "@/models/PageModel";
import AppShell from "@/components/AppShell";
import NotebookPagesActions from "@/components/NotebookPagesActions";
import NotebookDetailClient from "@/components/notebooks/NotebookDetailClient";

type LitePage = {
  pageIndex: number;
  pageToken: string;
  images?: { url: string }[];
};

export default async function NotebookOverviewPage(
  props: { params: Promise<{ id: string }> } // Next 15: params ist Promise
) {
  const { id: notebookId } = await props.params;
  if (!Types.ObjectId.isValid(notebookId)) notFound();

  await connectToDB();

  const nb = await Notebook.findById(notebookId)
    .select({ title: 1, _id: 0 })
    .lean<{ title?: string } | null>();

  if (!nb) notFound();

  // ✅ Nur Felder holen, die wir brauchen; Subdoc-_id NICHT mehr explizit excluden
  const rawPages = await Page.find({ notebookId })
    .select({
      _id: 0,
      pageIndex: 1,
      pageToken: 1,
      images: 1, // enthält evtl. _id/Date -> filtern wir unten raus
    })
    .sort({ pageIndex: 1 })
    .lean<Array<{ pageIndex: number; pageToken: string; images?: Array<any> }>>();

  // ✅ In Plain JSON umwandeln: nur pageIndex, pageToken und images[].url
  const pages: LitePage[] = rawPages.map((p) => ({
    pageIndex: Number(p.pageIndex),
    pageToken: String(p.pageToken),
    images: (p.images ?? [])
      .map((img: any) =>
        img?.url ? { url: String(img.url) } : null
      )
      .filter(Boolean) as { url: string }[],
  }));

  const totalPages =
    pages.length > 0 ? Math.max(...pages.map((p) => p.pageIndex)) : 0;

  return (
    <AppShell>
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">
          {nb?.title ?? "Notebook"} – Seiten
        </h1>
        <NotebookPagesActions notebookId={notebookId} />
      </div>

      {/* Client-Wrapper mit Tabs: Liste / Digital */}
      <NotebookDetailClient
        notebookId={notebookId}
        pages={pages}         // <- jetzt garantiert serialisierbar
        totalPages={totalPages}
      />
    </AppShell>
  );
}
