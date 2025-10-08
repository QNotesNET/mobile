// components/notebooks/NotebookDetailClient.tsx
"use client";

import Link from "next/link";
import { Suspense, useState } from "react";
import dynamic from "next/dynamic";
import Loader from "@/components/Loader";

const DigitalNotebook = dynamic(() => import("./DigitalNotebook"), { ssr: false });

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

  return (
    <div className="mt-6">
      <div className="mb-4 flex items-center gap-2">
        <button
          onClick={() => setView("list")}
          className={`px-3 py-1.5 rounded-xl border ${view === "list" ? "bg-gray-900 text-white" : "bg-white hover:bg-gray-50"}`}
        >
          Liste
        </button>
        <button
          onClick={() => setView("digital")}
          className={`px-3 py-1.5 rounded-xl border ${view === "digital" ? "bg-gray-900 text-white" : "bg-white hover:bg-gray-50"}`}
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
                <th className="px-4 py-3 text-left w-96">Aktionen</th>
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
                  const pageIdxStr = String(p.pageIndex);
                  const pageIdForExport = p.pageToken; // wir verwenden den Token als :id in der API

                  return (
                    <tr key={pageIdxStr} className="border-t">
                      <td className="px-4 py-3 font-medium">#{pageIdxStr}</td>
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
                        <div className="flex flex-wrap items-center gap-2">
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

                          {/* Downloads */}
                          {scanned ? (
                            <>
                              <a href={`/api/pages/${pageIdForExport}/export?format=pdf`} className="rounded border px-3 py-1 hover:bg-gray-50">
                                PDF
                              </a>
                              <a href={`/api/pages/${pageIdForExport}/export?format=jpg`} className="rounded border px-3 py-1 hover:bg-gray-50">
                                JPG
                              </a>
                              <a href={`/api/pages/${pageIdForExport}/export?format=png`} className="rounded border px-3 py-1 hover:bg-gray-50">
                                PNG
                              </a>
                            </>
                          ) : (
                            <>
                              <button
                                className="rounded border px-3 py-1 text-gray-400 cursor-not-allowed"
                                disabled
                                aria-disabled
                                title="Noch keine gescannte Seite vorhanden"
                              >
                                PDF
                              </button>
                              <button
                                className="rounded border px-3 py-1 text-gray-400 cursor-not-allowed"
                                disabled
                                aria-disabled
                                title="Noch keine gescannte Seite vorhanden"
                              >
                                PNG
                              </button>
                            </>
                          )}
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
        <Suspense fallback={<Loader small label="Digital-Ansicht lädt…" />}>
          <DigitalNotebook
            totalPages={totalPages}
            getPageSrc={(n) => {
              const p = pages.find((x) => Number(x.pageIndex) === Number(n));
              return p?.images?.[0]?.url ?? null;
            }}
          />
        </Suspense>
      )}
    </div>
  );
}
