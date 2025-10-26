"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Check } from "lucide-react";
import Link from "next/link";
// oben bei den Imports ergänzen:
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from "@/components/ui/dropdown-menu";
import { Calendar, CheckSquare, MessageSquare } from "lucide-react";
import { toast } from "sonner";

type ItemType = "CAL" | "WA" | "TODO";
type ItemStatus = "pending" | "accepted" | "rejected" | "editing";

type ActionItem = {
  id: string;
  type: ItemType;
  content: string;
  status: ItemStatus;
  editValue?: string; // Inhalt im Editfeld
};

// Utils: Bild clientseitig verkleinern & als File zurückgeben
async function downscaleImage(
  file: File,
  maxSide = 1600,
  quality = 0.75
): Promise<File> {
  const dataUrl = await new Promise<string>((res, rej) => {
    const r = new FileReader();
    r.onload = () => res(String(r.result));
    r.onerror = rej;
    r.readAsDataURL(file);
  });

  const img = await new Promise<HTMLImageElement>((res, rej) => {
    const i = new Image();
    i.onload = () => res(i);
    i.onerror = rej;
    i.src = dataUrl;
  });

  const scale = Math.min(1, maxSide / Math.max(img.width, img.height));
  const w = Math.round(img.width * scale);
  const h = Math.round(img.height * scale);

  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d")!;
  ctx.drawImage(img, 0, 0, w, h);

  const blob: Blob = await new Promise((res) =>
    canvas.toBlob((b) => res(b as Blob), "image/jpeg", quality)
  );

  return new File([blob], (file.name || "image") + ".jpg", {
    type: "image/jpeg",
  });
}

function parseOcrText(ocrText: string) {
  const lines = (ocrText || "").split(/\r?\n/);
  const items: ActionItem[] = [];
  const cleanedLines: string[] = [];
  // NEU: akzeptiert --kwTODO, --kw TODO, --kw: TODO, --kw:CAL usw.
  const re = /^\s*--\s*kw\s*:?\s*(CAL|WA|TODO)\s*:?\s*(.*)$/i;

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
      cleanedLines.push(content);
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
  notebookId,
  pageToken,
}: {
  pageId: string;
  notebookId: string;
  pageToken: string;
}) {
  const [busy, setBusy] = useState(false);
  const [submitting, setSubmitting] = useState(false); // disable während Bestätigen
  const [submitted, setSubmitted] = useState(false); // Success-Screen
  const [imageUrl, setImageUrl] = useState<string>("");
  const [text, setText] = useState<string>("");
  const [scanning, setScanning] = useState(false);
  const [scanError, setScanError] = useState<string | null>(null);
  const [items, setItems] = useState<ActionItem[]>([]);
  const [autoSaved, setAutoSaved] = useState(false);

  const [pagesContext, setPagesContext] = useState<object | null>(null);

  // --- Neu: State für manuelles Hinzufügen einer Aktion ---
  const [newType, setNewType] = useState<ItemType>("TODO");
  const [newContent, setNewContent] = useState<string>("");

  const r = useRouter();
  useEffect(() => {
    if (!pageId) {
      setPagesContext?.(null);
      return;
    }

    const ac = new AbortController();

    (async () => {
      try {
        const res = await fetch(`/api/pages-context?pageId=${pageId}`, {
          signal: ac.signal,
          cache: "no-store",
        });

        if (!res.ok) {
          // 404 = kein Eintrag vorhanden → false
          if (res.status === 404) {
            // setHasPagesContext(false);
            setPagesContext?.(null);
            return;
          }
          throw new Error(`Fetch failed: ${res.status}`);
        }

        const json = await res.json();
        const data = json?.data;

        setPagesContext?.(data ?? null);
        console.log(data);
      } catch (err) {
        if (!ac.signal.aborted) {
          console.error("failed to load existing pages-context", err);
          setPagesContext?.(null);
        }
      }
    })();

    return () => ac.abort();
  }, []);

  // ---- Scan-Queue: Helper ----
  // @ts-expect-error ---
  function buildItemsFromJob(job): ActionItem[] {
    const next: ActionItem[] = [
      ...(Array.isArray(job.cal) ? job.cal : []).map(
        (c: string, i: number) => ({
          id: `cal-${i}`,
          type: "CAL" as const,
          content: c,
          status: "pending",
        })
      ),
      ...(Array.isArray(job.wa) ? job.wa : []).map((c: string, i: number) => ({
        id: `wa-${i}`,
        type: "WA" as const,
        content: c,
        status: "pending",
      })),
      ...(Array.isArray(job.todo) ? job.todo : []).map(
        (c: string, i: number) => ({
          id: `todo-${i}`,
          type: "TODO" as const,
          content: c,
          status: "pending",
        })
      ),
    ];
    return next;
  }

  async function startScanJob(publicUrl: string) {
    await fetch("/api/page-scans", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ pageId, notebookId, imageUrl: publicUrl }),
    });
  }

  function pollScanJob() {
    setScanning(true);
    const tick = async () => {
      try {
        const r = await fetch(`/api/page-scans/${pageId}`);
        const { job } = await r.json();
        if (!job) return setTimeout(tick, 1500);

        if (job.status === "succeeded") {
          setImageUrl(job.imageUrl || "");
          // Text serverseitig schon bereinigt – wir erlauben nachträgliches Editieren
          setText(job.text || "");
          setItems(buildItemsFromJob(job));
          setScanning(false);
          return;
        }
        if (job.status === "failed") {
          setScanError(job.error || "AI-Scan fehlgeschlagen.");
          setScanning(false);
          return;
        }
        // queued/processing
        setTimeout(tick, 1500);
      } catch {
        setTimeout(tick, 2000);
      }
    };
    tick();
  }

  // Beim Mount: evtl. bestehende Jobs laden (Seite verlassen/neu laden)
  useEffect(() => {
    (async () => {
      try {
        const r = await fetch(`/api/page-scans/${pageId}`);
        const { job } = await r.json();
        if (!job) return;

        if (job.status === "succeeded") {
          setImageUrl(job.imageUrl || "");
          setText(job.text || "");
          setItems(buildItemsFromJob(job));
        } else if (job.status === "queued" || job.status === "processing") {
          pollScanJob();
        }
      } catch {
        /* ignore */
      }
    })();
  }, [pageId]);

  // Auto-Weiterleitung aus Kamera (SessionStorage) → lädt & triggert Scan-Job
  useEffect(() => {
    try {
      const raw = sessionStorage.getItem("scan:pending");
      if (!raw) return;
      const parsed = JSON.parse(raw) as {
        notebookId: string;
        pageToken: string;
        pageIndex: number;
        imageDataUrl: string;
      };
      if (!parsed || !parsed.imageDataUrl) return;
      if (pageToken && parsed.pageToken !== pageToken) return; // falsche Seite

      sessionStorage.removeItem("scan:pending");

      // DataURL -> Blob
      const m = parsed.imageDataUrl.match(/^data:(.+);base64,(.*)$/);
      if (!m) return;
      const mime = m[1];
      const bin = atob(m[2]);
      const bytes = new Uint8Array(bin.length);
      for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
      const blob = new Blob([bytes], { type: mime });
      const file = new File([blob], "scan.jpg", { type: mime });

      (async () => {
        setBusy(true);
        setText("");
        setScanError(null);
        setItems([]);
        try {
          // ▼▼▼ Downscale auch im Auto-Pfad
          let uploadFile = file;
          if (
            uploadFile.size > 1_000_000 ||
            (uploadFile.type.startsWith("image/") &&
              /jpeg|png|heic|heif/i.test(uploadFile.type))
          ) {
            uploadFile = await downscaleImage(uploadFile, 1600, 0.75);
          }

          // 1) Presign
          const presignRes = await fetch("/api/uploads/presign", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              pageId,
              fileName: uploadFile.name,
              contentType: uploadFile.type || "application/octet-stream",
            }),
          });
          if (!presignRes.ok) {
            const err = await presignRes.json().catch(() => ({}));
            throw new Error(err?.error || "Presign fehlgeschlagen.");
          }
          const { uploadUrl, publicUrl, key } = await presignRes.json();

          // 2) Upload
          const putRes = await fetch(uploadUrl, {
            method: "PUT",
            headers: {
              "Content-Type": uploadFile.type || "application/octet-stream",
            },
            body: uploadFile,
          });
          if (!putRes.ok) throw new Error("Upload zu S3 fehlgeschlagen.");

          // 3) Referenz speichern
          const saveRes = await fetch(`/api/pages/${pageId}/images`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ url: publicUrl, key }),
          });
          if (!saveRes.ok) {
            const err = await saveRes.json().catch(() => ({}));
            throw new Error(
              err?.error || "Speichern des Bildes fehlgeschlagen."
            );
          }

          // Bild anzeigen
          setImageUrl(publicUrl);

          // 4) Scan-Job starten & pollen
          await startScanJob(publicUrl);
          pollScanJob();
        } catch (e) {
          console.error("auto upload failed", e);
          setScanError(
            (e as Error)?.message || "Fehler beim automatischen Upload."
          );
        } finally {
          setBusy(false);
          r.refresh();
        }
      })();
    } catch {
      /* ignore */
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pageToken, pageId, notebookId]);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();

    const form = e.currentTarget;
    const input = form.elements.namedItem("file") as HTMLInputElement | null;
    let file = input?.files?.[0];
    if (!file) return toast.error("Bitte eine Datei auswählen.");

    // Mobile-Fotos sind riesig -> verkleinern
    if (
      file.size > 1_000_000 || // > ~1 MB
      (file.type.startsWith("image/") && /jpeg|png|heic|heif/i.test(file.type))
    ) {
      file = await downscaleImage(file, 1600, 0.75);
    }

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

      // Bild sofort anzeigen
      setImageUrl(publicUrl);

      // 4) Scan-Job starten & pollen
      await startScanJob(publicUrl);
      pollScanJob();

      r.refresh();
    } catch (e) {
      console.error(e);
      toast.error((e as string) || "Upload fehlgeschlagen");
    } finally {
      setBusy(false);
      (e.currentTarget as HTMLFormElement).reset();
    }
  }

  function updateItemStatus(id: string, status: ItemStatus) {
    setItems((prev) =>
      prev.map((it) => (it.id === id ? { ...it, status } : it))
    );
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

  // per-Card speichern: nur lokal übernehmen
  function applyItemEdit(id: string) {
    setItems((prev) =>
      prev.map((x) =>
        x.id === id
          ? {
              ...x,
              content: (x.editValue ?? x.content).trim(),
              status: "accepted",
            }
          : x
      )
    );
  }

  // --- Neu: manuellen Eintrag hinzufügen ---
  function addManualItem() {
    const trimmed = (newContent || "").trim();
    if (!trimmed) return;
    setItems((prev) => [
      ...prev,
      {
        id: `manual-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        type: newType,
        content: trimmed,
        status: "pending",
        editValue: trimmed,
      },
    ]);
    setNewContent("");
  }

  // globaler Speichern/Bestätigen-Button unten:
  async function saveAll() {
    setSubmitting(true);

    const accepted = items.filter((x) => x.status === "accepted");
    const todo = accepted
      .filter((x) => x.type === "TODO")
      .map((x) => x.content);
    const cal = accepted.filter((x) => x.type === "CAL").map((x) => x.content);
    const wa = accepted.filter((x) => x.type === "WA").map((x) => x.content);

    const notebookid = notebookId;

    const payload = {
      todo,
      cal,
      wa,
      text,
      notebookid,
      imageUrl: imageUrl || null,
      page: pageId,
    };

    try {
      const res = await fetch("/api/pages-context", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const msg = await res.text().catch(() => "");
        throw new Error(msg || "Speichern in pages_context fehlgeschlagen.");
      }
      setSubmitted(true);
    } catch (e) {
      console.error("pages_context save failed", e);
      toast.error((e as string) || "Speichern fehlgeschlagen");
      setSubmitting(false);
    }
  }

  // Auto-Save: wenn Text da ist, keine Items erkannt wurden und noch nichts gespeichert wurde
  // useEffect(() => {
  //   if (
  //     !scanning &&
  //     text &&
  //     items.length === 0 &&
  //     pagesContext == null &&
  //     !submitted &&
  //     !submitting &&
  //     !autoSaved
  //   ) {
  //     setAutoSaved(true);
  //     // sofort ohne Benutzer-Interaktion speichern
  //     void saveAll();
  //   }
  // }, [
  //   scanning,
  //   text,
  //   items.length,
  //   pagesContext,
  //   submitted,
  //   submitting,
  //   autoSaved,
  // ]);

  // Success-Screen
  if (submitted) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="text-center">
          <div className="mx-auto mb-6 h-24 w-24 rounded-full bg-emerald-500 border-4 border-emerald-200 shadow-lg flex items-center justify-center">
            <Check className="h-12 w-12 text-white" />
          </div>
          <h2 className="text-2xl font-semibold">Erfolgreich abgesendet</h2>
          <p className="text-gray-600 mt-1">
            Deine Einträge wurden gespeichert und stehen ab sofort im Dashboard
            bereit.
          </p>

          <button
            type="button"
            className="mt-6 bg-black text-white rounded px-4 py-2"
            onClick={() => r.push("/")}
          >
            Zurück zum Dashboard
          </button>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="grid gap-3 border rounded-xl p-4">
      {/* Upload-Controls AUSBLENDEN, wenn bereits Bild vorhanden oder Scan läuft */}
      {!(imageUrl || scanning) && (
        <>
          <input
            type="file"
            name="file"
            accept="image/*"
            required
            className="hidden lg:inline"
          />
          <button
            className="bg-black text-white rounded px-3 py-2 disabled:opacity-50 hidden lg:inline"
            disabled={busy || submitting}
          >
            {busy ? "Hochladen…" : "Hochladen"}
          </button>
          <p className="text-sm text-gray-600 lg:hidden">
            Drücke den Grünen Knopf in der Mitte um mit dem Scannen zu beginnen.
          </p>
        </>
      )}

      {scanning && (
        <>
          <div className="flex items-center gap-2 text-md text-gray-600">
            <Loader2 className="h-4 w-4 animate-spin" />
            <span>Foto wird gerade verarbeitet...</span>
          </div>
          <span className="text-xs text-gray-500">
            Bitte habe einen Moment Geduld, du kannst dieses Fenster schließen.
          </span>
        </>
      )}

      {/* Vorschau & Ergebnisse */}
      {imageUrl && (
        <div className="mt-2 w-full grid grid-cols-1 lg:grid-cols-2 gap-4 items-start">
          {/* Bild */}
          <div className="w-full">
            <img
              src={imageUrl}
              alt="Upload preview"
              className="rounded border w-full h-auto"
            />
          </div>

          {/* Aktion-Cards */}
          <div className="flex flex-col w-full">
            {/* Neu: manuellen Eintrag hinzufügen */}
            {!pagesContext && (
              <div className="mt-2 mb-2 rounded-lg border p-3">
                <div className="text-sm font-semibold mb-2">
                  Aktion hinzufügen
                </div>

                <div className="flex flex-col sm:flex-row gap-2 items-stretch sm:items-center">
                  {/* Type Dropdown */}
                  <div className="sm:w-40 w-full">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="outline" className="w-full justify-between">
                          {newType === "TODO" && (
                            <span className="inline-flex items-center gap-2">
                              <CheckSquare className="h-4 w-4" /> Aufgabe
                            </span>
                          )}
                          {newType === "CAL" && (
                            <span className="inline-flex items-center gap-2">
                              <Calendar className="h-4 w-4" /> Kalendar
                            </span>
                          )}
                          {newType === "WA" && (
                            <span className="inline-flex items-center gap-2">
                              <MessageSquare className="h-4 w-4" /> WhatsApp
                            </span>
                          )}
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="start" className="w-40">
                        <DropdownMenuItem onClick={() => setNewType("TODO")}>
                          <CheckSquare className="mr-2 h-4 w-4" />
                          <span>Aufgabe</span>
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => setNewType("CAL")}>
                          <Calendar className="mr-2 h-4 w-4" />
                          <span>Kalendar</span>
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => setNewType("WA")}>
                          <MessageSquare className="mr-2 h-4 w-4" />
                          <span>WhatsApp</span>
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>

                  {/* Textfeld + Hinzufügen */}
                  <input
                    type="text"
                    className="flex-1 min-w-0 border rounded px-2 py-2 text-sm"
                    placeholder="Beschreibung eingeben…"
                    value={newContent}
                    onChange={(e) => setNewContent(e.target.value)}
                    disabled={submitting}
                  />
                  <Button
                    type="button"
                    variant="secondary"
                    className="px-3 py-2 cursor-pointer w-full sm:w-auto"
                    onClick={addManualItem}
                    disabled={submitting || !newContent.trim()}
                  >
                    Hinzufügen
                  </Button>
                </div>
              </div>
            )}

            {!!items.length && !pagesContext && (
              <div className="mt-3 grid gap-3">
                <p className="lg:text-lg font-semibold text-sm text-center lg:text-left my-4 lg:my-0">
                  Bitte bestätige deine Automatisch erkannten Eingaben:
                </p>
                {items.map((it) => (
                  <div
                    key={it.id}
                    className={`rounded-xl border p-3 ${typeStyles(it.type)}`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="pr-3">
                        <div className="text-sm font-semibold">
                          {typeLabel(it.type)}
                        </div>
                        <div className="text-sm mt-1 break-words">{it.content}</div>

                        {/* Status-Badge */}
                        {!pagesContext && (
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
                        )}
                      </div>

                      {/* Controls */}
                      {pagesContext == null && (
                        <div className="flex gap-2 shrink-0">
                          <button
                            type="button"
                            title="Bestätigen"
                            className="rounded-lg border px-2 py-1 hover:bg-white disabled:opacity-50"
                            disabled={submitting}
                            onClick={() => updateItemStatus(it.id, "accepted")}
                          >
                            ✓
                          </button>
                          <button
                            type="button"
                            title="Ablehnen"
                            className="rounded-lg border px-2 py-1 hover:bg-white disabled:opacity-50"
                            disabled={submitting}
                            onClick={() => updateItemStatus(it.id, "rejected")}
                          >
                            ✗
                          </button>
                          <button
                            type="button"
                            title="Bearbeiten"
                            className="rounded-lg border px-2 py-1 hover:bg-white disabled:opacity-50"
                            disabled={submitting}
                            onClick={() => toggleEdit(it.id)}
                          >
                            ✎
                          </button>
                        </div>
                      )}
                    </div>

                    {/* Edit-Feld + lokales Speichern */}
                    {it.status === "editing" && (
                      <div className="mt-3">
                        <textarea
                          className="w-full rounded-lg border p-2 text-sm disabled:bg-gray-100"
                          rows={3}
                          value={it.editValue ?? ""}
                          onChange={(e) =>
                            updateEditValue(it.id, e.target.value)
                          }
                          disabled={submitting}
                        />
                        <div className="mt-2">
                          <button
                            type="button"
                            className="bg-black text-white rounded px-3 py-2 disabled:opacity-50"
                            disabled={submitting}
                            onClick={() => applyItemEdit(it.id)}
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

            {pagesContext && (
              <div className="mt-3 grid gap-3">
                {/* @ts-expect-error --- ctx defined */}
                {pagesContext.cal.map((ctx) => (
                  <div
                    key={ctx.id}
                    className={`rounded-xl border p-3 ${typeStyles("CAL")}`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="pr-3">
                        <div className="text-sm font-semibold">
                          {typeLabel("CAL")}
                        </div>
                        <div className="text-sm mt-1">{ctx}</div>
                      </div>
                    </div>
                  </div>
                ))}
                {/* @ts-expect-error --- ctx defined */}
                {pagesContext.todo.map((ctx) => (
                  <div
                    key={ctx.id}
                    className={`rounded-xl border p-3 ${typeStyles("TODO")}`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="pr-3">
                        <div className="text-sm font-semibold">
                          {typeLabel("TODO")}
                        </div>
                        <div className="text-sm mt-1">{ctx}</div>
                      </div>
                    </div>
                  </div>
                ))}
                {/* @ts-expect-error --- ctx defined */}
                {pagesContext.wa.map((ctx) => (
                  <div
                    key={ctx.id}
                    className={`rounded-xl border p-3 ${typeStyles("WA")}`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="pr-3">
                        <div className="text-sm font-semibold">
                          {typeLabel("WA")}
                        </div>
                        <div className="text-sm mt-1">{ctx}</div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Status / Fehler / Gesamter Text */}
            <div className="mt-3 text-sm text-gray-700 border-gray-500">
              {!scanning && !text && scanError && (
                <span className="text-red-600">{scanError}</span>
              )}
              {!scanning && text && (
                <div>
                  <div className="font-semibold mb-1">Erkannter Text:</div>
                  {/* Neu: Text vor dem Absenden bearbeiten */}
                  <textarea
                    className="w-full rounded-lg border p-2 text-sm disabled:bg-gray-100"
                    rows={6}
                    value={text}
                    onChange={(e) => setText(e.target.value)}
                    disabled={submitting || pagesContext != null}
                  />
                </div>
              )}
            </div>
            {/* Globaler Speichern/Bestätigen-Button */}
            {!!items.length && (
              <div className="mt-4 mb-16">
                {pagesContext != null ? (
                  <span className="text-sm text-gray-600">
                    Deine Einträge wurden bereits gespeichert.
                  </span>
                ) : (
                  <button
                    type="button"
                    className="bg-black text-white rounded px-3 py-2 disabled:opacity-50 w-full"
                    disabled={submitting}
                    onClick={saveAll}
                  >
                    {submitting
                      ? "Eingaben werden gespeichert..."
                      : "Eingaben Bestätigen"}
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </form>
  );
}
