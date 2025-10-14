"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function UploadForm({ pageId }: { pageId: string }) {
  const [busy, setBusy] = useState(false);        // nur für Upload/Speichern
  const [imageUrl, setImageUrl] = useState<string>(""); // S3-URL zur Anzeige
  const [text, setText] = useState<string>("");   // Scan-Ergebnis
  const [scanning, setScanning] = useState(false);
  const [scanError, setScanError] = useState<string | null>(null);

  const r = useRouter();

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();

    const form = e.currentTarget;
    const input = form.elements.namedItem("file") as HTMLInputElement | null;
    const file = input?.files?.[0];
    if (!file) return alert("Bitte eine Datei auswählen.");

    setBusy(true);
    setText("");
    setScanError(null);

    try {
      // 1) Presign
      const presignRes = await fetch("/api/uploads/presign", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          pageId,
          fileName: file.name,
          contentType: file.type || "application/octet-stream",
        }),
      });
      if (!presignRes.ok) {
        const err = await presignRes.json().catch(() => ({}));
        throw new Error(err?.error || "Presign fehlgeschlagen.");
      }
      const { uploadUrl, publicUrl, key } = await presignRes.json();

      // 2) Upload zu S3
      const putRes = await fetch(uploadUrl, {
        method: "PUT",
        headers: { "Content-Type": file.type || "application/octet-stream" },
        body: file,
      });
      if (!putRes.ok) {
        throw new Error("Upload zu S3 fehlgeschlagen.");
      }

      // ⇒ Bild SOFORT anzeigen
      setImageUrl(publicUrl);

      // 3) In DB referenzieren (warten wir der Einfachheit halber ab)
      const saveRes = await fetch(`/api/pages/${pageId}/images`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: publicUrl, key }),
      });
      if (!saveRes.ok) {
        const err = await saveRes.json().catch(() => ({}));
        throw new Error(err?.error || "Speichern des Bildes fehlgeschlagen.");
      }

      // 4) AI-Scan im Hintergrund STARTEN (nicht blockieren)
      setScanning(true);
      void (async () => {
        try {
          const aiRes = await fetch("/api/openai", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ imageUrl: publicUrl }),
          });
          if (!aiRes.ok) {
            const msg = await aiRes.text();
            throw new Error(msg || "AI-Scan fehlgeschlagen.");
          }
          const { text: ocrText } = await aiRes.json();
          setText(ocrText || "");
        } catch (err: any) {
          console.error("openai scan failed", err);
          setScanError(err?.message || "AI-Scan fehlgeschlagen.");
        } finally {
          setScanning(false);
        }
      })();

      r.refresh();
    } catch (e: any) {
      console.error(e);
      alert(e?.message || "Upload fehlgeschlagen");
    } finally {
      setBusy(false);
      form.reset();
    }
  }

  return (
    <form onSubmit={onSubmit} className="grid gap-3 border rounded-xl p-4">
      <input type="file" name="file" accept="image/*" required />
      <button
        className="bg-black text-white rounded px-3 py-2 disabled:opacity-50"
        disabled={busy}
      >
        {busy ? "Hochladen…" : "Hochladen"}
      </button>

      {/* Bild-Vorschau */}
      {imageUrl && (
        <div className="mt-2">
          <img
            src={imageUrl}
            alt="Upload preview"
            className="max-h-96 rounded border"
          />
          <div className="mt-2 text-sm text-gray-700">
            {scanning && "Scan läuft…"}
            {!scanning && text && (
              <>
                <div className="font-semibold mb-1">Erkannter Text:</div>
                <pre className="whitespace-pre-wrap break-words">{text}</pre>
              </>
            )}
            {!scanning && !text && scanError && (
              <span className="text-red-600">{scanError}</span>
            )}
          </div>
        </div>
      )}
    </form>
  );
}
