"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";

export type DigitalNotebookProps = {
  totalPages: number;
  getPageSrc: (pageNumber: number) => string | null | undefined;
  initialPage?: number;
  placeholderSrc?: string;
  shellBackgroundSrc?: string;
  className?: string;
};

const DEFAULT_PLACEHOLDER_SVG =
  "data:image/svg+xml;utf8," +
  encodeURIComponent(`
  <svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 1200 1600'>
    <defs>
      <filter id='shadow' x='-20%' y='-20%' width='140%' height='140%'>
        <feDropShadow dx='0' dy='8' stdDeviation='12' flood-opacity='0.15'/>
      </filter>
      <pattern id='lines' width='1' height='28' patternUnits='userSpaceOnUse'>
        <line x1='0' y1='27' x2='1200' y2='27' stroke='#c7c7c7' stroke-width='2'/>
      </pattern>
    </defs>
    <rect x='40' y='32' width='1120' height='1536' rx='18' ry='18' fill='white' filter='url(#shadow)'/>
    <rect x='60' y='52' width='1080' height='1496' fill='url(#lines)'/>
    <text x='50%' y='50%' dominant-baseline='middle' text-anchor='middle' fill='#6b7280' font-family='system-ui, -apple-system, Segoe UI, Roboto, Inter' font-size='64'>
      Kein Scan vorhanden
    </text>
  </svg>`);

const DEFAULT_SHELL_SVG =
  "data:image/svg+xml;utf8," +
  encodeURIComponent(`
  <svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 2600 1700' preserveAspectRatio='xMidYMid slice'>
    <rect width='100%' height='100%' fill='#1f2937'/>
    <rect x='70' y='70' width='2460' height='1560' rx='32' ry='32' fill='#111827' stroke='#0b1220' stroke-width='8'/>
    <rect x='90' y='90' width='2420' height='1520' rx='26' ry='26' fill='#e5e7eb'/>
    <rect x='1290' y='70' width='20' height='1560' fill='#0b1220' opacity='0.6'/>  
  </svg>`);

export default function DigitalNotebook({
  totalPages,
  getPageSrc,
  initialPage = 1,
  placeholderSrc,
  shellBackgroundSrc,
  className,
}: DigitalNotebookProps) {
  const [leftPage, setLeftPage] = useState(() => normalizeLeft(initialPage));
  const rightPage = Math.min(leftPage + 1, totalPages);
  const jumpInputRef = useRef<HTMLInputElement>(null);

  const placeholder = placeholderSrc ?? DEFAULT_PLACEHOLDER_SVG;
  const shell = shellBackgroundSrc ?? DEFAULT_SHELL_SVG;

  function normalizeLeft(p: number) {
    if (p < 1) return 1;
    if (p > totalPages) p = totalPages;
    return p % 2 === 0 ? p - 1 : p; // immer linke Seite (ungerade)
  }

  const canPrev = leftPage > 1;
  const canNext = rightPage < totalPages;

  const goPrev = useCallback(() => {
    if (!canPrev) return;
    setLeftPage((p) => Math.max(1, p - 2));
  }, [canPrev]);

  const goNext = useCallback(() => {
    if (!canNext) return;
    setLeftPage((p) => Math.min(normalizeLeft(totalPages), p + 2));
  }, [canNext, totalPages]);

  const goTo = useCallback((page: number) => {
    setLeftPage(normalizeLeft(page));
  }, [totalPages]);

  // Keyboard navigation
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "ArrowLeft") goPrev();
      if (e.key === "ArrowRight") goNext();
      if (e.key.toLowerCase() === "g") jumpInputRef.current?.focus();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [goPrev, goNext]);

  const leftSrc  = useMemo(() => getPageSrc(leftPage)  ?? placeholder, [getPageSrc, leftPage,  placeholder]);
  const rightSrc = useMemo(() => getPageSrc(rightPage) ?? placeholder, [getPageSrc, rightPage, placeholder]);

  return (
    <div className={"w-full flex flex-col gap-3 min-h-[70vh] " + (className ?? "")}>
      {/* Header */}
      <div className="flex items-center justify-between gap-3">
        <div className="text-sm text-gray-600">
          Seitenbereich: <span className="font-medium">Seite {leftPage}–{rightPage}</span> / {totalPages}
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={goPrev}
            disabled={!canPrev}
            className="px-3 py-1.5 rounded-xl border border-gray-300 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
            aria-label="Vorherige Doppelseite"
          >
            ←
          </button>
          <button
            onClick={goNext}
            disabled={!canNext}
            className="px-3 py-1.5 rounded-xl border border-gray-300 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
            aria-label="Nächste Doppelseite"
          >
            →
          </button>
          <form
            className="flex items-center gap-2 ml-3"
            onSubmit={(e) => {
              e.preventDefault();
              const v = Number(jumpInputRef.current?.value || 1);
              if (!Number.isFinite(v)) return;
              const page = Math.min(Math.max(1, Math.round(v)), totalPages);
              goTo(page);
            }}
          >
            <label className="text-sm text-gray-600">Gehe zu</label>
            <input
              ref={jumpInputRef}
              type="number"
              min={1}
              max={totalPages}
              defaultValue={leftPage}
              className="w-24 px-3 py-1.5 rounded-xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              aria-label="Seitennummer eingeben"
            />
            <button type="submit" className="px-3 py-1.5 rounded-xl bg-indigo-600 text-white hover:bg-indigo-700">
              OK
            </button>
          </form>
        </div>
      </div>

      {/* Book stage */}
      <div className="relative w-full grow rounded-3xl overflow-hidden shadow-sm bg-gray-200">
        {/* Shell background */}
        <img
          src={shell}
          alt="Notebook-Hülle"
          className="absolute inset-0 w-full h-full object-cover"
          aria-hidden
        />

        {/* Pages */}
        <div className="absolute inset-0 p-4 sm:p-6 md:p-8 flex items-stretch justify-center">
          <div className="w-full max-w-7xl grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
            <PageCard pageNumber={leftPage} src={leftSrc} />
            <PageCard pageNumber={rightPage} src={rightSrc} />
          </div>
        </div>
      </div>

      <div className="flex items-center justify-between text-xs text-gray-500">
        <div>Tipp: ← / → zum Blättern, G zum Springen.</div>
        <div>Nicht gescannte Seiten zeigen einen Platzhalter.</div>
      </div>
    </div>
  );
}

function PageCard({ pageNumber, src }: { pageNumber: number; src: string }) {
  return (
    <div className="relative bg-white rounded-2xl shadow-lg overflow-hidden flex flex-col border border-gray-200">
      <div className="absolute top-2 right-3 text-xs text-gray-600 bg-white/70 backdrop-blur px-2 py-1 rounded-full">
        Seite {pageNumber}
      </div>
      <div className="grow flex items-center justify-center">
        <img
          src={src}
          alt={`Seite ${pageNumber}`}
          loading="lazy"
          className="w-full h-full object-contain select-none"
          draggable={false}
        />
      </div>
    </div>
  );
}
