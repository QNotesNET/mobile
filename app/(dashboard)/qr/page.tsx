// app/(dashboard)/qr/page.tsx
"use client";

import { useEffect, useState } from "react";

export default function QRCenterPage() {
  const [tab, setTab] = useState<"single" | "sheet">("single");
  const [notebookId, setNotebookId] = useState<string>("");
  const [singleUrl, setSingleUrl] = useState<string>("");
  const [targetUrl, setTargetUrl] = useState<string>("");
  const [isCopying, setIsCopying] = useState<boolean>(false);

  useEffect(() => {
    // Demo-Notebook-ID – später aus Auswahl/Liste übernehmen
    setNotebookId("demo-notebook-123");
  }, []);

  const genSingle = async () => {
    if (!notebookId) return;
    const r = await fetch(`/api/qr/single?notebookId=${encodeURIComponent(notebookId)}`, { cache: "no-store" });
    if (!r.ok) return;
    const { dataUrl, targetUrl } = (await r.json()) as { dataUrl: string; targetUrl: string };
    setSingleUrl(dataUrl);
    setTargetUrl(targetUrl);
  };

  const downloadSheet = () => {
    if (!notebookId) return;
    const url = `/api/qr/sheet?notebookId=${encodeURIComponent(notebookId)}&perPage=24`;
    window.open(url, "_blank");
  };

  const copyTarget = async () => {
    if (!targetUrl) return;
    try {
      await navigator.clipboard.writeText(targetUrl);
      setIsCopying(true);
      setTimeout(() => setIsCopying(false), 900);
    } catch {
      // no-op
    }
  };

  return (
    <div className="mx-auto max-w-3xl">
      <h1 className="text-2xl font-semibold tracking-tight">QR-Center</h1>
      <p className="mt-1 text-sm text-gray-500">Erzeuge QR-Codes zum Drucken oder als Einzelcode.</p>

      <div className="mt-6 flex gap-2 rounded-full border p-1 w-fit">
        <button
          onClick={() => setTab("single")}
          className={`rounded-full px-3 py-1.5 text-sm ${
            tab === "single" ? "bg-gray-900 text-white" : "text-gray-600 hover:bg-gray-100"
          }`}
        >
          Einzelcode
        </button>
        <button
          onClick={() => setTab("sheet")}
          className={`rounded-full px-3 py-1.5 text-sm ${
            tab === "sheet" ? "bg-gray-900 text-white" : "text-gray-600 hover:bg-gray-100"
          }`}
        >
          A4-Bogen
        </button>
      </div>

      <div className="mt-6 space-y-4">
        <label className="block text-sm font-medium text-gray-900">Notebook ID</label>
        <input
          className="w-full rounded-xl border border-gray-300 px-3 py-2 text-sm"
          value={notebookId}
          onChange={(e) => setNotebookId(e.target.value)}
          placeholder="notebook_abc123"
        />
      </div>

      {tab === "single" ? (
        <div className="mt-6 rounded-2xl border p-4">
          <button
            onClick={genSingle}
            className="rounded-xl bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-black"
          >
            Einzel-QR generieren
          </button>

          {singleUrl ? (
            <div className="mt-5 space-y-4">
              <img src={singleUrl} alt="QR Code" className="h-auto w-48 rounded-lg border" />

              {/* Ziel-URL Anzeige + Aktionen */}
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Ziel-URL (Registrierung)</label>
                <div className="flex flex-col sm:flex-row gap-2">
                  <input
                    readOnly
                    value={targetUrl}
                    className="flex-1 rounded-xl border border-gray-300 px-3 py-2 text-sm font-mono"
                  />
                  <div className="flex gap-2">
                    <button
                      onClick={copyTarget}
                      className="rounded-xl border border-gray-300 px-3 py-2 text-sm hover:bg-gray-50"
                    >
                      {isCopying ? "Kopiert ✓" : "Kopieren"}
                    </button>
                    <a
                      href={targetUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="rounded-xl bg-gray-900 px-3 py-2 text-sm font-medium text-white hover:bg-black"
                    >
                      Öffnen
                    </a>
                  </div>
                </div>
                <p className="mt-2 text-xs text-gray-500">
                  Scanne den QR oder nutze die URL direkt, um das Notizbuch zu registrieren.
                </p>
              </div>

              {/* Optional: Direkt als PNG speichern */}
              <div>
                <a
                  href={singleUrl}
                  download={`qnotes-${notebookId}.png`}
                  className="inline-block text-sm text-gray-700 underline"
                >
                  Als PNG herunterladen
                </a>
              </div>
            </div>
          ) : null}
        </div>
      ) : (
        <div className="mt-6 rounded-2xl border p-4">
          <p className="text-sm text-gray-600">Erzeugt einen A4-PDF-Bogen mit mehreren QR-Codes.</p>
          <div className="mt-3">
            <button
              onClick={downloadSheet}
              className="rounded-xl bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-black"
            >
              A4-Bogen herunterladen (PDF)
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
