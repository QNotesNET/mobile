/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import Link from "next/link";
import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import dynamic from "next/dynamic";
import Loader from "@/components/Loader";
import { useRouter } from "next/navigation";
import { ArrowDownTrayIcon } from "@heroicons/react/24/outline";
import { Input } from "../ui/input";

const DigitalNotebook = dynamic(() => import("./DigitalNotebook"), {
  ssr: false,
});
const TextNotebook = dynamic(() => import("./TextNotebook"), { ssr: false });

type LitePage = {
  pageIndex: number | string;
  pageToken: string;
  images?: { url: string }[];
  id?: string;
  _id?: string;
};

type CtxStatus = "processing" | "done" | null;

export default function NotebookDetailClient({
  notebookId,
  pages,
  totalPages,
}: {
  notebookId: string;
  pages: LitePage[];
  totalPages: number;
}) {
  const [view, setView] = useState<"list" | "digital" | "text">("list");
  const [searchQuery, setSearchQuery] = useState("");
  const [ctxStatus, setCtxStatus] = useState<Record<string, CtxStatus>>({});
  const [visibleCount, setVisibleCount] = useState(10); // 👈 Start-Limit
  const observerRef = useRef<HTMLDivElement | null>(null);

  // === Sichtbasiertes Lazy Loading ===
  useEffect(() => {
    if (!observerRef.current) return;
    const observer = new IntersectionObserver((entries) => {
      if (entries[0].isIntersecting) {
        // Wenn Scroll-Ende sichtbar → weitere 10 Seiten laden
        setVisibleCount((v) => v + 10);
      }
    });
    observer.observe(observerRef.current);
    return () => observer.disconnect();
  }, []);

  const visiblePages = useMemo(() => {
    return pages.slice(0, visibleCount);
  }, [pages, visibleCount]);

  const filteredPages = useMemo(() => {
    if (!searchQuery.trim()) return visiblePages;
    const q = searchQuery.trim().toLowerCase();
    return visiblePages.filter((p) =>
      String(p.pageIndex).toLowerCase().includes(q)
    );
  }, [searchQuery, visiblePages]);

  useEffect(() => {
    const abort = new AbortController();
    const candidates = visiblePages.filter(
      (p) => (p.images?.length ?? 0) === 0
    );

    async function fetchOne(token: string) {
      try {
        const url = `/api/pages-context?notebookId=${encodeURIComponent(
          notebookId
        )}&pageToken=${encodeURIComponent(token)}`;
        const res = await fetch(url, {
          signal: abort.signal,
          cache: "no-store",
        });

        if (res.status === 404) return { token, status: null as CtxStatus };
        if (!res.ok) return { token, status: null as CtxStatus };

        const data = await res.json();
        const d = data?.data ?? data;
        let status: CtxStatus = null;
        if (
          d?.status === "processing" ||
          d?.state === "processing" ||
          d?.processing === true
        )
          status = "processing";
        else if (d) status = "done";

        return { token, status };
      } catch {
        return { token, status: null as CtxStatus };
      }
    }

    async function run() {
      const results = await Promise.all(
        candidates.map((p) => fetchOne(p.pageToken))
      );
      setCtxStatus((prev) => {
        const next = { ...prev };
        for (const r of results) next[r.token] = r.status;
        return next;
      });
    }

    if (candidates.length) run();
    return () => abort.abort();
  }, [notebookId, visiblePages]);

  const r = useRouter();

  function getPageTokenByIndex(n: number): string | null {
    const p = pages.find((x) => Number(x.pageIndex) === Number(n));
    return p?.pageToken ?? null;
  }

  function downloadPage(pageId: string) {
    const url = `/api/pages/${pageId}/export?format=png`;
    const fileName = `qnotes-page-${pageId}.png`;

    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
    // @ts-expect-error ---
    const isInWebView = !!window.ReactNativeWebView;

    if (isIOS || isInWebView) {
      const iframe = document.createElement("iframe");
      iframe.style.display = "none";
      iframe.src = url;
      document.body.appendChild(iframe);
      setTimeout(() => iframe.remove(), 3000);
    } else {
      const a = document.createElement("a");
      a.href = url;
      a.download = fileName;
      a.target = "_blank";
      document.body.appendChild(a);
      a.click();
      a.remove();
    }
  }

  return (
    <div className="mt-6">
      <div className="mb-4 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setView("list")}
            className={`px-3 py-1.5 rounded-xl border ${
              view === "list"
                ? "bg-gray-900 text-white"
                : "bg-white hover:bg-gray-50"
            }`}
          >
            Liste
          </button>
          <button
            onClick={() => setView("text")}
            className={`px-3 py-1.5 rounded-xl border ${
              view === "text"
                ? "bg-gray-900 text-white"
                : "bg-white hover:bg-gray-50"
            }`}
          >
            Textdarstellung
          </button>
      <button
        onClick={() => setView("digital")}
        className={`px-3 py-1.5 rounded-xl border ${
          view === "digital"
            ? "bg-gray-900 text-white"
            : "bg-white hover:bg-gray-50"
        }`}
      >
        Bildansicht
      </button>
        </div>
      </div>


      {view !== "text" && view !== "digital" && (
        <Input
          className="w-full mb-3"
          placeholder="Seite suchen"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
      )}

      {view === "list" ? (
        <div className="overflow-hidden rounded-2xl border bg-white">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-gray-600">
              <tr>
                <th className="px-4 py-3 text-left w-24">Seite</th>
                <th className="px-4 py-3 text-left hidden lg:block">Token</th>
                <th className="px-4 py-3 text-left w-40">Status</th>
                <th className="px-4 py-3 text-right w-full hidden lg:block">
                  Aktionen
                </th>
                <th className="px-4 py-3 text-left w-[460px] lg:hidden">
                  Herunterladen
                </th>
              </tr>
            </thead>
            <tbody>
              {filteredPages.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-4 py-6 text-gray-500">
                    Keine Seite gefunden.
                  </td>
                </tr>
              ) : (
                filteredPages.map((p) => {
                  const scanned = (p.images?.length ?? 0) > 0;
                  const pageIdxStr = String(p.pageIndex);
                  const pageIdForExport = p.pageToken;
                  const ctx = scanned ? null : ctxStatus[p.pageToken] ?? null;
                  const isProcessing = ctx === "processing";

                  const badgeClass = isProcessing
                    ? "bg-amber-100 text-amber-800"
                    : scanned
                    ? "bg-green-100 text-green-700"
                    : "bg-gray-100 text-gray-600";
                  const badgeText = isProcessing
                    ? "in Verarbeitung"
                    : scanned
                    ? "gescannt"
                    : "leer";

                  return (
                    <tr
                      key={pageIdxStr}
                      className="border-t cursor-pointer hover:bg-gray-50"
                      onClick={() =>
                        (window.location.href = `/s/${p.pageToken}`)
                      }
                    >
                      <td className="px-4 py-3 font-medium w-full lg:w-min">
                        Seite {pageIdxStr}
                      </td>
                      <td className="px-4 py-3 font-mono hidden lg:block">
                        {p.pageToken}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs ${badgeClass}`}
                        >
                          {badgeText}
                        </span>
                      </td>
                      <td className="px-4 py-3 flex justify-end">
                        {scanned && (
                          <button
                            onClick={() => downloadPage(pageIdForExport)}
                            className="rounded border px-3 py-1 hover:bg-gray-50 md:hidden"
                          >
                            <ArrowDownTrayIcon className="h-4 w-4 text-gray-800" />
                          </button>
                        )}

                        <Link
                          href={`/s/${p.pageToken}`}
                          className="rounded bg-black px-3 py-1 text-white hover:bg-black/90 hidden lg:block"
                        >
                          Öffnen
                        </Link>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>

          {/* 🔻 Scroll-Ende-Indikator */}
          <div
            ref={observerRef}
            className="h-10 w-full text-center text-gray-400 text-sm py-2"
          >
            {visibleCount < pages.length
              ? "Scrollen, um mehr anzuzeigen…"
              : "Alle Seiten geladen"}
          </div>
        </div>
      ) : view === "digital" ? (
        <Suspense fallback={<Loader small label="Digital-Ansicht lädt…" />}>
          <DigitalNotebook
            totalPages={totalPages}
            getPageSrc={(n) => {
              const p = pages.find((x) => Number(x.pageIndex) === Number(n));
              return p?.images?.[0]?.url ?? null;
            }}
          />
        </Suspense>
      ) : (
        <Suspense fallback={<Loader small label="Textdarstellung lädt…" />}>
          <TextNotebook
            totalPages={totalPages}
            notebookId={notebookId}
            getPageToken={(n) => getPageTokenByIndex(n)}
          />
        </Suspense>
      )}
    </div>
  );
}
