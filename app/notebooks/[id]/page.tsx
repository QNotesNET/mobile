// app/notebooks/[id]/page.tsx
import { notFound } from "next/navigation";
import { Types } from "mongoose";
import { connectToDB } from "@/lib/mongoose";
import Notebook from "@/models/Notebook";
import Page from "@/models/PageModel";
import AppShell from "@/components/AppShell";
import NotebookPagesActions from "@/components/NotebookPagesActions";
import NotebookDetailClient from "@/components/notebooks/NotebookDetailClient";

type LiteImage = { url: string };
type LitePage = {
  pageIndex: number;
  pageToken: string;
  images?: LiteImage[];
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

  // Nur benötigte Felder holen; Subdocs typisieren
  const rawPages = await Page.find({ notebookId })
    .select({
      _id: 0,
      pageIndex: 1,
      pageToken: 1,
      images: 1,
    })
    .sort({ pageIndex: 1 })
    .lean<Array<{ pageIndex: number; pageToken: string; images?: Array<{ url?: unknown }> }>>();

  // In Plain JSON + richtige Typen bringen
  const pages: LitePage[] = rawPages.map((p) => ({
    pageIndex: Number(p.pageIndex),
    pageToken: String(p.pageToken),
    images: (p.images ?? [])
      .map((img): LiteImage | null => {
        const urlVal = img?.url;
        if (typeof urlVal === "string" && urlVal.length > 0) return { url: urlVal };
        return null;
      })
      .filter(Boolean) as LiteImage[],
  }));

  const totalPages = pages.length > 0 ? Math.max(...pages.map((p) => p.pageIndex)) : 0;

  return (
    <AppShell>
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">
          {nb?.title ?? "Notebook"} – Seiten
        </h1>
        <NotebookPagesActions notebookId={notebookId} />
      </div>

      <NotebookDetailClient
        notebookId={notebookId}
        pages={pages}
        totalPages={totalPages}
      />
    </AppShell>
  );
}
