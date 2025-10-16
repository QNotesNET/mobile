"use client";

import Link from "next/link";
import { Suspense, useState, useRef } from "react";
import dynamic from "next/dynamic";
import Loader from "@/components/Loader";
import { useRouter } from "next/navigation";
import { ArrowDownTrayIcon } from "@heroicons/react/24/outline";
import { Button, Input } from "@headlessui/react";

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

  // --- NEU: Scan-Modal ---
  const [scanOpen, setScanOpen] = useState(false);
  const [scanBusy, setScanBusy] = useState(false);
  const fileRef = useRef<HTMLInputElement | null>(null);
  const r = useRouter();

  // --- Helper: Bild runter skalieren & als JPEG erzeugen ---
  async function downscaleImageToJpeg(
    file: File,
    maxDim = 1600,
    quality = 0.7
  ): Promise<{ blob: Blob; dataUrl: string }> {
    const imgUrl = URL.createObjectURL(file);
    try {
      const img = await new Promise<HTMLImageElement>((resolve, reject) => {
        const el = new Image();
        el.onload = () => resolve(el);
        el.onerror = (e) => reject(e);
        el.src = imgUrl;
      });

      const { width, height } = img;
      if (!width || !height) {
        // Fallback: gib Original zurück
        const buf = await file.arrayBuffer();
        const blob = new Blob([buf], { type: "image/jpeg" });
        const dataUrlFallback = await new Promise<string>((res) => {
          const fr = new FileReader();
          fr.onload = () => res(String(fr.result || ""));
          fr.readAsDataURL(blob);
        });
        return { blob, dataUrl: dataUrlFallback };
      }

      // Zielgröße berechnen
      let targetW = width;
      let targetH = height;
      if (Math.max(width, height) > maxDim) {
        if (width >= height) {
          targetW = maxDim;
          targetH = Math.round((height / width) * maxDim);
        } else {
          targetH = maxDim;
          targetW = Math.round((width / height) * maxDim);
        }
      }

      const canvas = document.createElement("canvas");
      canvas.width = targetW;
      canvas.height = targetH;
      const ctx = canvas.getContext("2d");
      if (!ctx) throw new Error("Canvas context not available");
      ctx.drawImage(img, 0, 0, targetW, targetH);

      const blob: Blob = await new Promise((resolve, reject) =>
        canvas.toBlob(
          (b) => (b ? resolve(b) : reject(new Error("toBlob failed"))),
          "image/jpeg",
          quality
        )
      );

      const dataUrl: string = await new Promise((resolve) =>
        canvas.toBlob(
          (b) => {
            if (!b) {
              resolve("");
              return;
            }
            const fr = new FileReader();
            fr.onload = () => resolve(String(fr.result || ""));
            fr.readAsDataURL(b);
          },
          "image/jpeg",
          quality
        )
      );

      return { blob, dataUrl };
    } finally {
      URL.revokeObjectURL(imgUrl);
    }
  }

  async function onPickFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      setScanBusy(true);

      // ↓↓↓ WICHTIG: Runterskalieren (mobile Quota-Fix)
      const { blob, dataUrl } = await downscaleImageToJpeg(file, 1600, 0.7);

      // 2) an Erkennungs-API: pageIndex + pageToken bestimmen (mit komprimiertem Bild)
      const form = new FormData();
      form.append("image", new File([blob], "scan.jpg", { type: "image/jpeg" }));
      const resp = await fetch(
        `/api/scan/recognize-page?notebookId=${encodeURIComponent(notebookId)}`,
        {
          method: "POST",
          body: form,
        }
      );
      if (!resp.ok) {
        const msg = await resp.text().catch(() => "");
        throw new Error(msg || "Seitenerkennung fehlgeschlagen.");
      }
      const { pageIndex, pageToken } = (await resp.json()) as {
        pageIndex: number;
        pageToken: string;
      };

      // 3) Payload in Session legen – UploadForm liest das dann aus (komprimierte DataURL!)
      const payload = { notebookId, pageToken, pageIndex, imageDataUrl: dataUrl };
      sessionStorage.setItem("scan:pending", JSON.stringify(payload));

      // 4) Redirect direkt zur Scan-Seite
      r.push(`/s/${pageToken}`);
      setScanOpen(false);
    } catch (err) {
      console.error("scan recognize error", err);
      alert((err as Error)?.message || "Scan fehlgeschlagen");
    } finally {
      setScanBusy(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

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

        {/* NEU: Seite scannen (statt QR-Bogen PDF) */}
        <button
          onClick={() => setScanOpen(true)}
          className="ml-auto inline-flex items-center rounded-xl border px-3 py-1.5 hover:bg-gray-50"
        >
          Seite scannen
        </button>
      </div>

      {/* Modal */}
      {scanOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-5 shadow-xl">
            <h3 className="text-lg font-semibold">Seite scannen</h3>
            <p className="mt-1 text-sm text-gray-600">
              Foto aufnehmen oder Bild aus der Galerie wählen. Die Seitennummer wird erkannt und du wirst automatisch zur richtigen Seite weitergeleitet.
            </p>

            <div className="mt-4">
              <input
                ref={fileRef}
                type="file"
                accept="image/*"
                capture="environment"
                onChange={onPickFile}
                disabled={scanBusy}
                className="block w-full text-sm file:mr-3 file:rounded-lg file:border file:bg-white file:px-3 file:py-2 hover:file:bg-gray-50 disabled:opacity-50"
              />
            </div>

            <div className="mt-5 flex items-center justify-end gap-2">
              <button
                className="rounded px-3 py-1.5 hover:bg-gray-50"
                onClick={() => !scanBusy && setScanOpen(false)}
                disabled={scanBusy}
              >
                Abbrechen
              </button>
              <button
                className="rounded bg-black px-3 py-1.5 text-white disabled:opacity-50"
                disabled
                title="Bitte oben ein Bild auswählen"
              >
                {scanBusy ? "Erkenne…" : "Weiter"}
              </button>
            </div>
          </div>
        </div>
      )}

      {view === "list" ? (
        <div className="overflow-hidden rounded-2xl border bg-white">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-gray-600">
              <tr>
                <th className="px-4 py-3 text-left w-24">Seite</th>
                <th className="px-4 py-3 text-left">Token</th>
                <th className="px-4 py-3 text-left w-40">Status</th>
                <th className="px-4 py-3 text-left w-[460px]">Aktionen</th>
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
                  const pageIdForExport = p.pageToken;

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
                      <td className="px-4 py-3 flex justify-end">
                        <div className="flex flex-wrap items-center gap-2">
                          {/* <Link
                            href={`/notebooks/${notebookId}/page/${p.pageIndex}`}
                            className="rounded border px-3 py-1 hover:bg-gray-50"
                          >
                            Öffnen
                          </Link> */}

                          {scanned && (
                            <>
                              <a
                                href={`/api/pages/${pageIdForExport}/export?format=png`}
                                className="rounded border px-3 py-1 hover:bg-gray-50 md:hidden"
                              >
                                <ArrowDownTrayIcon className="h-4 w-4 text-gray-800" />
                              </a>
                            </>
                          )}

                          <Link
                            href={`/s/${p.pageToken}`}
                            className="rounded bg-black px-3 py-1 text-white hover:bg-black/90"
                          >
                            Öffnen
                          </Link>

                          {/* <Link
                            href={`/notebooks/${notebookId}/page/${p.pageIndex}/qr`}
                            className="rounded border px-3 py-1 hover:bg-gray-50"
                            title="QR-Detailseite"
                          >
                            QR
                          </Link> */}

                          {scanned ? (
                            <div className="hidden md:flex gap-x-2">
                              <a
                                href={`/api/pages/${pageIdForExport}/export?format=pdf`}
                                className="rounded border px-3 py-1 hover:bg-gray-50"
                              >
                                PDF
                              </a>
                              <a
                                href={`/api/pages/${pageIdForExport}/export?format=jpg`}
                                className="rounded border px-3 py-1 hover:bg-gray-50"
                              >
                                JPG
                              </a>
                              <a
                                href={`/api/pages/${pageIdForExport}/export?format=png`}
                                className="rounded border px-3 py-1 hover:bg-gray-50"
                              >
                                PNG
                              </a>
                            </div>
                          ) : (
                            <div className="hidden md:flex gap-x-2">
                              <button className="rounded border px-3 py-1 text-gray-400 cursor-not-allowed" disabled aria-disabled title="Noch keine gescannte Seite vorhanden">
                                PDF
                              </button>
                              <button className="rounded border px-3 py-1 text-gray-400 cursor-not-allowed" disabled aria-disabled title="Noch keine gescannte Seite vorhanden">
                                JPG
                              </button>
                              <button className="rounded border px-3 py-1 text-gray-400 cursor-not-allowed" disabled aria-disabled title="Noch keine gescannte Seite vorhanden">
                                PNG
                              </button>
                            </div>
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
