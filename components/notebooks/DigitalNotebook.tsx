"use client";

import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

export type DigitalNotebookProps = {
  totalPages: number;
  getPageSrc: (pageNumber: number) => string | null | undefined;
  initialPage?: number;
  placeholderSrc?: string;
  className?: string;
};

const DEFAULT_PLACEHOLDER_SVG =
  "data:image/svg+xml;utf8," +
  encodeURIComponent(`
  <svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 1200 1600'>
    <rect width='100%' height='100%' fill='white'/>
    <text x='50%' y='50%' dominant-baseline='middle' text-anchor='middle' fill='#6b7280' font-family='system-ui' font-size='48'>
      Kein Scan vorhanden
    </text>
  </svg>`);

export default function DigitalNotebook({
  totalPages,
  getPageSrc,
  initialPage = 1,
  placeholderSrc,
  className,
}: DigitalNotebookProps) {
  const [current, setCurrent] = useState(initialPage);
  const touchStartX = useRef<number | null>(null);
  const jumpInputRef = useRef<HTMLInputElement | null>(null);

  const placeholder = placeholderSrc ?? DEFAULT_PLACEHOLDER_SVG;

  const canPrev = current > 1;
  const canNext = current < totalPages;

  const goPrev = useCallback(() => {
    if (canPrev) setCurrent((p) => Math.max(1, p - 1));
  }, [canPrev]);

  const goNext = useCallback(() => {
    if (canNext) setCurrent((p) => Math.min(totalPages, p + 1));
  }, [canNext, totalPages]);

  const goTo = useCallback(
    (page: number) => {
      const safe = Math.min(Math.max(1, page), totalPages);
      setCurrent(safe);
    },
    [totalPages]
  );

  // --- Keyboard navigation
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "ArrowLeft") goPrev();
      if (e.key === "ArrowRight") goNext();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [goPrev, goNext]);

  // --- Swipe navigation
  function handleTouchStart(e: React.TouchEvent) {
    touchStartX.current = e.touches[0].clientX;
  }
  function handleTouchEnd(e: React.TouchEvent) {
    if (touchStartX.current === null) return;
    const delta = e.changedTouches[0].clientX - touchStartX.current;
    if (Math.abs(delta) > 60) {
      if (delta > 0) goPrev();
      else goNext();
    }
    touchStartX.current = null;
  }

  const currentSrc = useMemo(
    () => getPageSrc(current) ?? placeholder,
    [current, getPageSrc, placeholder]
  );

  return (
    <div
      className={`rounded-2xl border bg-white p-3 select-none ${
        className ?? ""
      }`}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      {/* Toolbar */}
      <div className="mb-3 flex items-center gap-2 text-sm">
        <span className="text-gray-600">
          Seite <strong>{current}</strong> / {totalPages}
        </span>

        <div className="ml-auto flex items-center gap-2">
          <button
            onClick={goPrev}
            disabled={!canPrev}
            className={`rounded-lg border px-2 py-1 ${
              canPrev ? "hover:bg-gray-50" : "opacity-40 cursor-not-allowed"
            }`}
            aria-label="Zurück"
            title="Zurück"
          >
            ←
          </button>

          <div className="inline-flex items-center gap-1">
            <input
              ref={jumpInputRef}
              type="number"
              min={1}
              max={totalPages}
              defaultValue={current}
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
                const n = Number(jumpInputRef.current?.value || "1");
                goTo(n);
              }}
              className="rounded-lg bg-black px-3 py-1 text-white"
            >
              OK
            </button>
          </div>

          <button
            onClick={goNext}
            disabled={!canNext}
            className={`rounded-lg border px-2 py-1 ${
              canNext ? "hover:bg-gray-50" : "opacity-40 cursor-not-allowed"
            }`}
            aria-label="Weiter"
            title="Weiter"
          >
            →
          </button>
        </div>
      </div>

      {/* Seite */}
      <div className="relative aspect-[3/4] overflow-hidden rounded-xl border bg-white shadow-sm">
        <div className="absolute top-2 right-3 text-xs text-gray-400 bg-white/70 backdrop-blur px-2 py-1 rounded-full">
          Seite {current}
        </div>

        <div className="absolute inset-0 flex items-center justify-center p-3">
          <img
            src={currentSrc}
            alt={`Seite ${current}`}
            loading="lazy"
            draggable={false}
            className="max-h-full max-w-full object-contain"
          />
        </div>
      </div>
    </div>
  );
}
