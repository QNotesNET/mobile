// app/notebooks/[id]/page.tsx
import Link from "next/link";
import { notFound } from "next/navigation";
import { Types } from "mongoose";
import { connectToDB } from "@/lib/mongoose";
import Notebook from "@/models/Notebook";
import Page from "@/models/PageModel";
import AppShell from "@/components/AppShell";
import NotebookPagesActions from "@/components/NotebookPagesActions";

type LitePage = {
  pageIndex: number;
  pageToken: string;
  images?: { url: string }[];
};

export default async function NotebookOverviewPage(
  props: { params: Promise<{ id: string }> } // ⬅ params ist ein Promise (Next 15)
) {
  const { id: notebookId } = await props.params; // ⬅ awaiten
  if (!Types.ObjectId.isValid(notebookId)) notFound();

  await connectToDB();

  const nb = await Notebook.findById(notebookId)
    .select({ title: 1, _id: 0 })
    .lean<{ title?: string } | null>();

  if (!nb) notFound();

  const pages = await Page.find({ notebookId })
    .select({ pageIndex: 1, pageToken: 1, images: 1, _id: 0 })
    .sort({ pageIndex: 1 })
    .lean<LitePage[]>();

  return (
    <AppShell>
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">
          {nb?.title ?? "Notebook"} – Seiten
        </h1>
        <NotebookPagesActions notebookId={notebookId} />
      </div>

      <div className="mt-6 overflow-hidden rounded-2xl border bg-white">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-gray-600">
            <tr>
              <th className="px-4 py-3 text-left w-24">Seite</th>
              <th className="px-4 py-3 text-left">Token</th>
              <th className="px-4 py-3 text-left w-40">Status</th>
              <th className="px-4 py-3 text-left w-64">Aktionen</th>
            </tr>
          </thead>
          <tbody>
            {pages.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-4 py-6 text-gray-500">
                  Noch keine Seiten vorhanden. Erzeuge neue Seiten über den Button oben rechts.
                </td>
              </tr>
            ) : (
              pages.map((p) => {
                const scanned = (p.images?.length ?? 0) > 0;
                return (
                  <tr key={p.pageIndex} className="border-t">
                    <td className="px-4 py-3 font-medium">#{p.pageIndex}</td>
                    <td className="px-4 py-3 font-mono">{p.pageToken}</td>
                    <td className="px-4 py-3">
                      <span
                        className={
                          "inline-flex items-center rounded-full px-2 py-0.5 text-xs " +
                          (scanned
                            ? "bg-green-100 text-green-700"
                            : "bg-gray-100 text-gray-600")
                        }
                      >
                        {scanned ? "gescannt" : "leer"}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex gap-2">
                        <Link
                          href={`/notebooks/${notebookId}/page/${p.pageIndex}`}
                          className="rounded border px-3 py-1 hover:bg-gray-50"
                        >
                          Öffnen
                        </Link>
                        <Link
                          href={`/s/${p.pageToken}`}
                          className="rounded bg-black px-3 py-1 text-white hover:bg-black/90"
                        >
                          Scannen
                        </Link>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </AppShell>
  );
}
