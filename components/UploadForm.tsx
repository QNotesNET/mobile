"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";

type ItemType = "CAL" | "WA" | "TODO";
type ItemStatus = "pending" | "accepted" | "rejected" | "editing";

type ActionItem = {
  id: string;
  type: ItemType;
  content: string;
  status: ItemStatus;
  editValue?: string; // UI: Inhalt im Editfeld
};

function parseOcrText(ocrText: string) {
  const lines = (ocrText || "").split(/\r?\n/);
  const items: ActionItem[] = [];
  const cleanedLines: string[] = [];
  const re = /^\s*--kw\s+(CAL|WA|TODO)\s*:?\s*(.*)$/i;

  lines.forEach((raw, i) => {
    const m = raw.match(re);
    if (m) {
      const type = m[1].toUpperCase() as ItemType;
      const content = (m[2] || "").trim();
      items.push({
        id: `it-${i}-${Math.random().toString(36).slice(2, 7)}`,
        type,
        content,
        status: "pending",
        editValue: content,
      });
      cleanedLines.push(content); // ohne --kw
    } else {
      cleanedLines.push(raw);
    }
  });

  return {
    items,
    cleanedText: cleanedLines.join("\n").trim(),
  };
}

function typeLabel(t: ItemType) {
  switch (t) {
    case "CAL":
      return "Neuer Kalendereintrag";
    case "WA":
      return "Neue WhatsApp-Nachricht";
    case "TODO":
      return "Neue Aufgabe";
  }
}

function typeStyles(t: ItemType) {
  switch (t) {
    case "CAL":
      return "border-blue-300 bg-blue-50";
    case "WA":
      return "border-green-300 bg-green-50";
    case "TODO":
      return "border-amber-300 bg-amber-50";
  }
}

export default function UploadForm({
  pageId,
  notebookId, // optional – nur fürs Console-Log, Logik bleibt gleich
}: {
  pageId: string;
  notebookId?: string;
}) {
  const [busy, setBusy] = useState(false);
  const [imageUrl, setImageUrl] = useState<string>("");
  const [text, setText] = useState<string>("");
  const [scanning, setScanning] = useState(false);
  const [scanError, setScanError] = useState<string | null>(null);
  const [items, setItems] = useState<ActionItem[]>([]);

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
    setItems([]);

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
      if (!putRes.ok) throw new Error("Upload zu S3 fehlgeschlagen.");

      // Bild sofort anzeigen
      setImageUrl(publicUrl);

      // 3) In DB referenzieren
      const saveRes = await fetch(`/api/pages/${pageId}/images`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: publicUrl, key }),
      });
      if (!saveRes.ok) {
        const err = await saveRes.json().catch(() => ({}));
        throw new Error(err?.error || "Speichern des Bildes fehlgeschlagen.");
      }

      // 4) AI-Scan im Hintergrund (nur Frontend-Parsing unten)
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
          const { items, cleanedText } = parseOcrText(ocrText || "");
          setItems(items);
          setText(cleanedText);
        } catch (err) {
          console.error("openai scan failed", err);
          setScanError((err as string) || "AI-Scan fehlgeschlagen.");
        } finally {
          setScanning(false);
        }
      })();

      r.refresh();
    } catch (e) {
      console.error(e);
      alert((e as string) || "Upload fehlgeschlagen");
    } finally {
      setBusy(false);
      (e.currentTarget as HTMLFormElement).reset();
    }
  }

  function updateItemStatus(id: string, status: ItemStatus) {
    setItems((prev) => prev.map((it) => (it.id === id ? { ...it, status } : it)));
  }

  function toggleEdit(id: string) {
    setItems((prev) =>
      prev.map((it) =>
        it.id === id
          ? {
              ...it,
              status: it.status === "editing" ? "pending" : "editing",
              editValue: it.editValue ?? it.content,
            }
          : it
      )
    );
  }

  function updateEditValue(id: string, value: string) {
    setItems((prev) =>
      prev.map((it) => (it.id === id ? { ...it, editValue: value } : it))
    );
  }

  function saveItem(id: string) {
    const it = items.find((x) => x.id === id);
    if (!it) return;

    const finalText = (it.editValue ?? it.content).trim();

    // Objekt fürs Logging bauen
    const payload = {
      todo: it.type === "TODO" ? finalText : null,
      cal: it.type === "CAL" ? finalText : null,
      wa: it.type === "WA" ? finalText : null,
      text, // gesamter (gesäuberter) OCR-Text
      notebookid: notebookId ?? null,
      imageUrl: imageUrl || null,
      page: pageId,
    };

    console.log("SAVE ITEM →", payload);

    // nach dem Speichern Status auf "accepted" und content übernehmen
    setItems((prev) =>
      prev.map((x) =>
        x.id === id ? { ...x, content: finalText, status: "accepted" } : x
      )
    );
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

      {/* Vorschau & Ergebnisse */}
      {imageUrl && (
        <div className="mt-2">
          <img
            src={imageUrl}
            alt="Upload preview"
            className="max-h-96 rounded border"
          />

          {/* Aktion-Cards */}
          {!!items.length && (
            <div className="mt-3 grid gap-3">
              {items.map((it) => (
                <div
                  key={it.id}
                  className={`rounded-xl border p-3 ${typeStyles(
                    it.type
                  )}`}
                >
                  <div className="flex items-start justify-between">
                    <div className="pr-3">
                      <div className="text-sm font-semibold">
                        {typeLabel(it.type)}
                      </div>
                      <div className="text-sm mt-1">{it.content}</div>

                      {/* Status-Badge */}
                      <div className="mt-2">
                        {it.status === "pending" && (
                          <span className="text-xs px-2 py-0.5 rounded bg-gray-200">
                            ausstehend
                          </span>
                        )}
                        {it.status === "accepted" && (
                          <span className="text-xs px-2 py-0.5 rounded bg-emerald-200">
                            bestätigt
                          </span>
                        )}
                        {it.status === "rejected" && (
                          <span className="text-xs px-2 py-0.5 rounded bg-red-200">
                            abgelehnt
                          </span>
                        )}
                        {it.status === "editing" && (
                          <span className="text-xs px-2 py-0.5 rounded bg-amber-200">
                            zur Bearbeitung
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Controls */}
                    <div className="flex gap-2 shrink-0">
                      <button
                        type="button"
                        title="Bestätigen"
                        className="rounded-lg border px-2 py-1 hover:bg-white"
                        onClick={() => updateItemStatus(it.id, "accepted")}
                      >
                        ✓
                      </button>
                      <button
                        type="button"
                        title="Ablehnen"
                        className="rounded-lg border px-2 py-1 hover:bg-white"
                        onClick={() => updateItemStatus(it.id, "rejected")}
                      >
                        ✗
                      </button>
                      <button
                        type="button"
                        title="Bearbeiten"
                        className="rounded-lg border px-2 py-1 hover:bg-white"
                        onClick={() => toggleEdit(it.id)}
                      >
                        ✎
                      </button>
                    </div>
                  </div>

                  {/* Edit-Feld + Speichern (nur wenn editing) */}
                  {it.status === "editing" && (
                    <div className="mt-3">
                      <textarea
                        className="w-full rounded-lg border p-2 text-sm"
                        rows={3}
                        value={it.editValue ?? ""}
                        onChange={(e) => updateEditValue(it.id, e.target.value)}
                      />
                      <div className="mt-2">
                        <button
                          type="button"
                          className="bg-black text-white rounded px-3 py-2"
                          onClick={() => saveItem(it.id)}
                        >
                          Speichern
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Status / Fehler / Gesamter Text (ohne --kw) */}
          <div className="mt-3 text-sm text-gray-700">
            {scanning && (
              <div className="flex items-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>Bilderkennung wird ausgeführt…</span>
              </div>
            )}
            {!scanning && !text && scanError && (
              <span className="text-red-600">{scanError}</span>
            )}
            {!scanning && text && (
              <>
                <div className="font-semibold mb-1">Erkannter Text:</div>
                <pre className="whitespace-pre-wrap break-words">{text}</pre>
              </>
            )}
          </div>
        </div>
      )}
    </form>
  );
}
