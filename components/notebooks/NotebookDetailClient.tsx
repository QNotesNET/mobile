"use client";

import Link from "next/link";
import { Suspense, useMemo, useState } from "react";
import dynamic from "next/dynamic";

// Digital-Ansicht lazy laden (kein SSR wegen <img>-Handling & Events)
const DigitalNotebook = dynamic(() => import("./DigitalNotebook"), {
  ssr: false,
});

type LitePage = {
  pageIndex: number | string;
  pageToken: string;
  images?: { url: string }[];
};

export default function NotebookDetailClient({
  notebookId,
  pages,
  totalPages,
}: {
  notebookId: string;
  pages: LitePage[];
  totalPages: number;
}) {
  const [view, setView] = useState<"list" | "digital">("list");

  // kleine Hilfsfunktionen
  const findUrl = (n: number) => {
    const p = pages.find((x) => Number(x.pageIndex) === Number(n));
    const url = p?.images?.[0]?.url ?? null;
    // Debug-Log pro Lookup
    // eslint-disable-next-line no-console
    console.log("[DigitalNotebook:getPageSrc]", { n, hit: !!p, imagesLen: p?.images?.length, url });
    return url;
  };

  // Debug für „welche Seiten haben überhaupt eine URL”
  const pagesWithUrl = useMemo(
    () =>
      pages
        .filter((p) => !!p.images?.[0]?.url)
        .map((p) => Number(p.pageIndex))
        .sort((a, b) => a - b),
    [pages]
  );

  return (
    <div className="mt-6">
      {/* Tabs */}
      <div className="mb-4 flex items-center gap-2">
        <button
          onClick={() => setView("list")}
          className={`px-3 py-1.5 rounded-xl border ${
            view === "list" ? "bg-gray-900 text-white" : "bg-white hover:bg-gray-50"
          }`}
        >
          Liste
        </button>
        <button
          onClick={() => setView("digital")}
          className={`px-3 py-1.5 rounded-xl border ${
            view === "digital" ? "bg-gray-900 text-white" : "bg-white hover:bg-gray-50"
          }`}
        >
          Digital
        </button>
      </div>

      {view === "list" ? (
        <div className="overflow-hidden rounded-2xl border bg-white">
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
                    <tr key={String(p.pageIndex)} className="border-t">
                      <td className="px-4 py-3 font-medium">#{String(p.pageIndex)}</td>
                      <td className="px-4 py-3 font-mono">{p.pageToken}</td>
                      <td className="px-4 py-3">
                        <span
                          className={
                            "inline-flex items-center rounded-full px-2 py-0.5 text-xs " +
                            (scanned ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-600")
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
      ) : (
        <>
          {/* mini Debug-Hinweis: welche Seiten haben URLs */}
          <div className="mb-2 text-xs text-gray-500">
            Debug: Seiten mit URL → {pagesWithUrl.length > 0 ? pagesWithUrl.join(", ") : "keine"}
          </div>

          <Suspense fallback={<div className="p-6 rounded-2xl border bg-white">Lade Digital-Ansicht…</div>}>
            <DigitalNotebook
              totalPages={totalPages}
              // ⬇️ DIREKTER LOOKUP: Seite -> URL (falls vorhanden)
              getPageSrc={(n) => findUrl(n)}
              // Optional:
              // shellBackgroundSrc="/qnotes/notebook-shell.svg"
              // placeholderSrc="/qnotes/placeholder-page.svg"
            />
          </Suspense>
        </>
      )}
    </div>
  );
}
