/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import React, { useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";

export default function Page() {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const [streamError, setStreamError] = useState<string | null>(null);
  const [photoBlob, setPhotoBlob] = useState<Blob | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const r = useRouter();
  const sp = useSearchParams();
  const notebookId = sp.get("notebookId") || "";

  // Kamera starten
  useEffect(() => {
    let currentStream: MediaStream | null = null;

    async function startCamera() {
      setStreamError(null);
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: { ideal: "environment" },
            width: { ideal: 1920 },
            height: { ideal: 1080 },
          },
          audio: false,
        });
        currentStream = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play().catch(() => {});
        }
      } catch (err: any) {
        setStreamError(
          err?.name === "NotAllowedError"
            ? "Kamerazugriff verweigert. Bitte erlaube den Zugriff in deinem Browser."
            : "Kamera konnte nicht gestartet werden."
        );
      }
    }

    startCamera();

    // Shutter vom AppShell-FAB
    const onShutter = () => capture();
    window.addEventListener("pb:scan-shutter", onShutter);

    return () => {
      if (currentStream) currentStream.getTracks().forEach((t) => t.stop());
      window.removeEventListener("pb:scan-shutter", onShutter);
    };
  }, []);

  function capture() {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) return;

    const w = video.videoWidth || 1280;
    const h = video.videoHeight || 720;

    canvas.width = w;
    canvas.height = h;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.drawImage(video, 0, 0, w, h);

    canvas.toBlob(
      (blob) => {
        setPhotoBlob(blob || null);
      },
      "image/jpeg",
      0.92
    );
  }

  function retake() {
    setPhotoBlob(null);
  }

  // Blob -> DataURL
  function blobToDataUrl(b: Blob): Promise<string> {
    return new Promise((resolve) => {
      const fr = new FileReader();
      fr.onload = () => resolve(String(fr.result || ""));
      fr.readAsDataURL(b);
    });
  }

  // 1) Seitennummer erkennen (wie NotebookDetailClient)
  async function recognizePageNumber(image: Blob): Promise<{ pageIndex: number; pageToken: string }> {
    if (!notebookId) throw new Error("notebookId fehlt. Rufe die Seite z.B. als /scan?notebookId=... auf.");

    const fd = new FormData();
    fd.append("image", new File([image], "scan.jpg", { type: "image/jpeg" }));

    const resp = await fetch(`/api/scan/recognize-page?notebookId=${encodeURIComponent(notebookId)}`, {
      method: "POST",
      body: fd,
    });

    if (!resp.ok) {
      const msg = await resp.text().catch(() => "");
      throw new Error(msg || "Seitenerkennung fehlgeschlagen.");
    }

    const { pageIndex, pageToken } = (await resp.json()) as { pageIndex: number; pageToken: string };
    return { pageIndex, pageToken };
  }

  // 2) uploadMedia-Flow anstoßen (SessionStorage + Redirect)
  async function submit() {
    if (!photoBlob) return;
    if (!notebookId) {
      toast.error("Fehlende notebookId. Bitte die Seite mit ?notebookId=... aufrufen.");
      return;
    }

    setIsSubmitting(true);
    try {
      const { pageIndex, pageToken } = await recognizePageNumber(photoBlob);
      const dataUrl = await blobToDataUrl(photoBlob);

      const payload = { notebookId, pageToken, pageIndex, imageDataUrl: dataUrl };
      sessionStorage.setItem("scan:pending", JSON.stringify(payload));

      r.push(`/s/${pageToken}`);
    } catch (e: any) {
      toast.error(e?.message || "Fehler beim Absenden.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="mx-auto max-w-md p-4">
      <h1 className="text-lg font-semibold mb-3">Seite scannen</h1>

      {!notebookId && (
        <p className="mb-3 rounded border border-amber-300 bg-amber-50 p-2 text-sm">
          Hinweis: Übergib <code>?notebookId=…</code> in der URL, damit die Seitennummer erkannt und die richtige Seite geöffnet werden kann.
        </p>
      )}

      {/* Kamera / Vorschau */}
      <div className="relative aspect-[3/4] w-full overflow-hidden rounded-xl border bg-black">
        {!photoBlob ? (
          <video ref={videoRef} className="h-full w-full object-cover" playsInline muted autoPlay />
        ) : (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={URL.createObjectURL(photoBlob)} alt="Vorschau" className="h-full w-full object-cover" />
        )}

        {/* Overlay: Absenden, nur wenn Foto vorhanden */}
        {photoBlob && (
          <div className="pointer-events-none absolute inset-x-0 bottom-0">
            {/* leichter Gradient fürs Lesen */}
            <div className="h-24 bg-gradient-to-t from-black/60 to-transparent" />
            <div className="pointer-events-auto absolute inset-x-3 bottom-3">
              <button
                onClick={submit}
                disabled={isSubmitting}
                className={`w-full rounded-xl px-4 py-3 text-white font-medium transition active:scale-95
                ${isSubmitting ? "bg-gray-400 cursor-not-allowed" : "bg-emerald-600 hover:bg-emerald-700"}`}
              >
                {isSubmitting ? "Sende…" : "Absenden"}
              </button>
            </div>
          </div>
        )}
      </div>

      {streamError && <p className="mt-3 text-sm text-red-600">{streamError}</p>}

      {/* Nur „Neu aufnehmen“ unten – der Auslöser kommt über den grünen FAB in der AppShell */}
      <div className="mt-4 flex items-center justify-between gap-3">
        <button
          onClick={retake}
          disabled={!photoBlob}
          className={`flex-1 rounded-lg border px-4 py-3 transition active:scale-95
          ${!photoBlob ? "cursor-not-allowed text-gray-400" : "hover:bg-gray-50"}`}
        >
          Neu aufnehmen
        </button>
      </div>

      <canvas ref={canvasRef} className="hidden" />
    </div>
  );
}
