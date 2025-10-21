"use client";

import { useEffect, useMemo, useRef, useState } from "react";

export default function TextNotebook({
  totalPages,
  notebookId,
  getPageToken,
}: {
  totalPages: number;
  notebookId: string;
  getPageToken: (page: number) => string | null | undefined;
}) {
  const [current, setCurrent] = useState(1); // linke Seite
  const inputRef = useRef<HTMLInputElement | null>(null);

  // Cache: key = `${notebookId}:${pageToken}`
  const [cache, setCache] = useState<
    Record<string, { text: string; loaded: boolean; error?: string }>
  >({});

  const maxLeftPage = useMemo(
    () => (totalPages % 2 === 0 ? totalPages - 1 : totalPages),
    [totalPages]
  );

  function clampToSpread(n: number) {
    let page = Math.max(1, Math.min(n, maxLeftPage));
    if (page % 2 === 0) page -= 1; // linke Seite
    return page;
  }

  const leftPage = current;
  const rightPage = Math.min(current + 1, totalPages);

  const canPrev = leftPage > 1;
  const canNext = rightPage < totalPages;

  function prevSpread() {
    setCurrent((c) => clampToSpread(c - 2));
  }
  function nextSpread() {
    setCurrent((c) => clampToSpread(c + 2));
  }
  function goTo(n: number) {
    setCurrent(clampToSpread(n));
  }

  async function ensureLoaded(pageNum: number) {
    const token = getPageToken(pageNum);
    if (!token) return;
    const key = `${notebookId}:${token}`;
    if (cache[key]?.loaded) return;

    try {
      const url = `/api/pages-context?notebookId=${encodeURIComponent(
        notebookId
      )}&pageToken=${encodeURIComponent(token)}`;
      const res = await fetch(url, { method: "GET" });
      if (!res.ok) {
        const msg = await res.text().catch(() => "");
        throw new Error(msg || `Fehler beim Laden (Seite ${pageNum})`);
      }
      const json = await res.json();
      const text: string = String(json?.data?.text || "");

      setCache((old) => ({
        ...old,
        [key]: { text, loaded: true },
      }));
    } catch (e: any) {
      setCache((old) => ({
        ...old,
        [key]: { text: "", loaded: true, error: e?.message || "Fehler" },
      }));
    }
  }

  useEffect(() => {
    void ensureLoaded(leftPage);
    if (rightPage !== leftPage) void ensureLoaded(rightPage);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [leftPage, rightPage, notebookId]);

  function getTextFor(pageNum: number): { text: string; loading: boolean; error?: string } {
    const token = getPageToken(pageNum);
    if (!token) return { text: "", loading: false, error: "Kein Token gefunden" };
    const key = `${notebookId}:${token}`;
    const entry = cache[key];
    if (!entry) return { text: "", loading: true };
    return { text: entry.text || "", loading: !entry.loaded, error: entry.error };
  }

  return (
    <div className="rounded-2xl border bg-white p-3">
      {/* Toolbar */}
      <div className="mb-3 flex items-center gap-2 text-sm">
        <span className="text-gray-600">
          Seitenbereich: <strong>Seite {leftPage}–{rightPage}</strong> / {totalPages}
        </span>

        <div className="ml-auto flex items-center gap-2">
          <button
            onClick={prevSpread}
            disabled={!canPrev}
            className={`rounded-lg border px-2 py-1 ${canPrev ? "hover:bg-gray-50" : "opacity-40 cursor-not-allowed"}`}
            aria-label="Zurück"
            title="Zurück"
          >
            ←
          </button>

          <div className="inline-flex items-center gap-1">
            <span className="text-gray-600">Gehe zu</span>
            <input
              ref={inputRef}
              type="number"
              min={1}
              max={totalPages}
              defaultValue={leftPage}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  const n = Number((e.target as HTMLInputElement).value || "1");
                  goTo(n);
                }
              }}
              className="w-16 rounded-lg border px-2 py-1 text-sm"
            />
            <button
              onClick={() => {
                const n = Number(inputRef.current?.value || "1");
                goTo(n);
              }}
              className="rounded-lg bg-black px-3 py-1 text-white"
            >
              OK
            </button>
          </div>

          <button
            onClick={nextSpread}
            disabled={!canNext}
            className={`rounded-lg border px-2 py-1 ${canNext ? "hover:bg-gray-50" : "opacity-40 cursor-not-allowed"}`}
            aria-label="Weiter"
            title="Weiter"
          >
            →
          </button>
        </div>
      </div>

      {/* Book spread */}
      <div className="relative grid grid-cols-1 gap-4 md:grid-cols-2">
        <PageView
          pageNumber={leftPage}
          data={getTextFor(leftPage)}
          lined
          labelPosition="tl"
        />
        <PageView
          pageNumber={rightPage}
          data={getTextFor(rightPage)}
          lined
          labelPosition="tr"
        />
      </div>

      {/* <p className="mt-3 text-right text-xs text-gray-500">
        Texte werden über <code>notebookId + pageToken</code> geladen. Footer-Seitenzahlen werden entfernt.
      </p> */}
    </div>
  );
}

/* ---------- Helpers zum Entfernen der Footer-Seitenzahl ---------- */
function escapeRegExp(s: string) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/** Entfernt die letzte Zeile, wenn sie nur die (aktuelle) Seitenzahl enthält –
 * optional mit "Seite"/"Page", Trennstrichen, Punkt/Klammer/Spaces.
 */
function stripFooterPageNumber(input: string, pageNumber: number): string {
  if (!input) return input;
  const trimmed = input.replace(/\s+$/g, ""); // trailing Leerzeilen/Spaces weg
  const lines = trimmed.split(/\r?\n/);
  if (lines.length === 0) return "";

  const last = (lines[lines.length - 1] || "").trim();
  const num = String(pageNumber);

  const patterns = [
    new RegExp(`^(?:seite|page)?\\s*${escapeRegExp(num)}\\s*$`, "i"),
    new RegExp(`^[-–—\\s]*${escapeRegExp(num)}[-–—\\s]*$`),
    new RegExp(`^${escapeRegExp(num)}[.)\\]\\s-]*$`),
  ];

  if (last && patterns.some((re) => re.test(last))) {
    lines.pop();
  }
  return lines.join("\n");
}

function PageView({
  pageNumber,
  data,
  lined = true,
  labelPosition = "tr",
}: {
  pageNumber: number;
  data: { text: string; loading: boolean; error?: string };
  lined?: boolean;
  labelPosition?: "tl" | "tr";
}) {
  const displayText = useMemo(
    () => stripFooterPageNumber(data.text, pageNumber),
    [data.text, pageNumber]
  );

  return (
    <div
      className={`relative aspect-[3/4] overflow-hidden rounded-xl border bg-white shadow-sm`}
      style={
        lined
          ? {
              backgroundImage:
                "linear-gradient(#0000 23px, #e5e7eb 24px), linear-gradient(90deg, #f8fafc, #fff)",
              backgroundSize: "100% 24px, 100% 100%",
              backgroundPosition: "0 0, 0 0",
            }
          : undefined
      }
    >
      {/* Seitenlabel */}
      <div
        className={`absolute ${
          labelPosition === "tr" ? "right-3 top-2" : "left-3 top-2"
        } text-xs text-gray-400`}
      >
        Seite {pageNumber}
      </div>

      {/* Content */}
      <div className="absolute inset-0 p-6">
        {data.loading ? (
          <div className="flex h-full items-center justify-center text-gray-400">
            Lädt …
          </div>
        ) : data.error ? (
          <div className="flex h-full items-center justify-center text-red-400">
            {/* {data.error} */}
          </div>
        ) : displayText?.trim() ? (
          <pre className="h-full w-full whitespace-pre-wrap break-words text-[0.95rem] leading-6 text-gray-800">
            {displayText}
          </pre>
        ) : (
          <div className="flex h-full items-center justify-center text-gray-400">
            Kein Text vorhanden
          </div>
        )}
      </div>
    </div>
  );
}
