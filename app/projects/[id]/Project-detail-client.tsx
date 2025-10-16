"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  FolderKanban,
  Plus,
  Pencil,
  Save,
  ArrowLeft,
  Image as ImageIcon,
  Circle,
} from "lucide-react";

type ProjectPayload = {
  id: string;
  title: string;
  description: string;
  status: "open" | "in_progress" | "done";
  createdAt?: string;
  updatedAt?: string;
};

/** UI-only Demo Daten für Listen (bleiben vorerst Fake) */
const demoBooks = [
  { id: "nb1", title: "Meeting Notizen", pages: 89, progress: 68 },
  { id: "nb2", title: "Projekt Hausbau Buchner", pages: 42, progress: 34 },
];
const demoScans = [
  { id: "sc1", title: "Rechnung 10/2025.pdf", ts: "vor 2 Std" },
  { id: "sc2", title: "Skizze: Fundament.jpg", ts: "Gestern" },
];

const STATUS_OPTIONS: Array<{ value: ProjectPayload["status"]; label: string }> = [
  { value: "open",        label: "offen" },
  { value: "in_progress", label: "in Arbeit" },
  { value: "done",        label: "erledigt" },
];

// Farbklassen für Badges
const statusClasses: Record<ProjectPayload["status"], { chip: string; dot: string }> = {
  open: {
    chip: "bg-gray-100 text-gray-800 border-gray-200",
    dot: "text-gray-500",
  },
  in_progress: {
    chip: "bg-amber-100 text-amber-900 border-amber-200",
    dot: "text-amber-500",
  },
  done: {
    chip: "bg-emerald-100 text-emerald-900 border-emerald-200",
    dot: "text-emerald-500",
  },
};

export default function ProjectDetailClient({ projectId }: { projectId: string }) {
  const [editing, setEditing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving]  = useState(false);
  const [error, setError]    = useState<string>("");

  // Daten
  const [project, setProject] = useState<ProjectPayload | null>(null);

  // Edit-Felder
  const [title, setTitle] = useState("");
  const [desc, setDesc]   = useState("");
  const [status, setStatus] = useState<ProjectPayload["status"]>("open");

  // Laden
  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        setLoading(true);
        setError("");
        const res = await fetch(`/api/projects/${projectId}`, { method: "GET", cache: "no-store" });
        if (!res.ok) throw new Error(await res.text());
        const data = (await res.json()) as ProjectPayload;
        if (!alive) return;
        setProject(data);
        setTitle(data.title);
        setDesc(data.description || "");
        setStatus(data.status || "open");
      } catch {
        setError("Projekt konnte nicht geladen werden.");
      } finally {
        setLoading(false);
      }
    })();
    return () => { alive = false; };
  }, [projectId]);

  // Speichern
  async function onSave() {
    try {
      setSaving(true);
      setError("");
      const body = { title: title.trim(), description: desc, status };
      const res = await fetch(`/api/projects/${projectId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error(await res.text());
      const updated = (await res.json()) as ProjectPayload;
      setProject(updated);
      setTitle(updated.title);
      setDesc(updated.description || "");
      setStatus(updated.status || "open");
      setEditing(false);
    } catch {
      setError("Speichern fehlgeschlagen.");
    } finally {
      setSaving(false);
    }
  }

  const statusLabel = useMemo(
    () => STATUS_OPTIONS.find((o) => o.value === (project?.status ?? "open"))?.label ?? "offen",
    [project?.status]
  );

  const chipCls = statusClasses[project?.status ?? "open"].chip;
  const dotCls  = statusClasses[project?.status ?? "open"].dot;

  return (
    <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6 md:py-8">
      {/* Breadcrumb / Back */}
      <div className="mb-4 flex items-center gap-2 text-sm text-gray-500">
        <Link href="/notebooks" className="inline-flex items-center gap-1 hover:underline">
          <ArrowLeft className="h-4 w-4" />
          Zur Übersicht
        </Link>
        <span className="select-none">/</span>
        <span className="truncate text-gray-700">Projekt</span>
        <span className="ml-auto rounded-full border px-2 py-0.5 text-xs text-gray-600">
          ID: {projectId}
        </span>
      </div>

      {/* Header Card */}
      <section className="relative overflow-hidden rounded-2xl border bg-white p-5 shadow-sm">
        {loading ? (
          <div className="text-sm text-gray-500">Lade Projekt …</div>
        ) : (
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div className="flex items-start gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl border">
                <FolderKanban className="h-6 w-6 text-gray-600" />
              </div>
              <div>
                {!editing ? (
                  <>
                    <h1 className="text-xl font-semibold leading-tight">
                      {project?.title ?? "Projekt"}
                    </h1>
                    <p className="mt-1 max-w-2xl text-sm text-gray-500">
                      {project?.description || "Keine Beschreibung hinterlegt."}
                    </p>
                  </>
                ) : (
                  <div className="flex flex-col gap-2">
                    <input
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      className="w-full rounded-xl border px-3 py-2 text-sm"
                      placeholder="Projekttitel"
                    />
                    <textarea
                      value={desc}
                      onChange={(e) => setDesc(e.target.value)}
                      rows={2}
                      className="w-full rounded-xl border px-3 py-2 text-sm"
                      placeholder="Beschreibung"
                    />
                    <div className="flex items-center gap-2">
                      <label className="text-sm text-gray-600">Status</label>
                      <select
                        value={status}
                        onChange={(e) => setStatus(e.target.value as ProjectPayload["status"])}
                        className="rounded-xl border px-3 py-2 text-sm"
                      >
                        {STATUS_OPTIONS.map((o) => (
                          <option value={o.value} key={o.value}>{o.label}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="flex items-center gap-2">
              <span className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs ${chipCls}`}>
                <Circle className={`h-3.5 w-3.5 ${dotCls}`} />
                Status: {statusLabel}
              </span>
              {!editing ? (
                <button
                  className="inline-flex items-center gap-2 rounded-xl border px-3 py-1.5 text-sm hover:bg-gray-50"
                  onClick={() => setEditing(true)}
                >
                  <Pencil className="h-4 w-4" />
                  Bearbeiten
                </button>
              ) : (
                <button
                  className="inline-flex items-center gap-2 rounded-xl bg-black px-3 py-1.5 text-sm text-white hover:bg-black/90 disabled:opacity-50"
                  onClick={onSave}
                  disabled={saving || !title.trim()}
                  title="Speichern"
                >
                  <Save className="h-4 w-4" />
                  {saving ? "Speichere…" : "Speichern"}
                </button>
              )}
            </div>
          </div>
        )}

        {/* Error hint */}
        {error && <div className="mt-3 text-sm text-red-600">{error}</div>}
        {/* Deko-Element entfernt */}
      </section>

      {/* Grid (Listen bleiben vorerst UI) */}
      <div className="mt-6 grid gap-6 md:grid-cols-3">
        <section className="md:col-span-2 rounded-2xl border bg-white p-5 shadow-sm">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h2 className="text-base font-semibold">Zugeordnete Powerbooks</h2>
              <p className="text-sm text-gray-500">Welche Powerbooks gehören zu diesem Projekt?</p>
            </div>
            <button className="inline-flex items-center gap-2 rounded-xl border px-3 py-1.5 text-sm hover:bg-gray-50">
              <Plus className="h-4 w-4" />
              Zuweisen
            </button>
          </div>

          <ul className="divide-y rounded-xl border">
            {demoBooks.length === 0 && (
              <li className="p-6 text-sm text-gray-500">Noch keine Powerbooks zugewiesen.</li>
            )}

            {demoBooks.map((b) => (
              <li
                key={b.id}
                className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="flex items-center gap-3">
                  <div className="h-8 w-8 rounded-lg bg-gray-100" />
                  <div>
                    <div className="font-medium">{b.title}</div>
                    <div className="text-xs text-gray-500">
                      {b.pages} Seiten • Fortschritt {b.progress}%
                    </div>
                  </div>
                </div>
                <div className="flex flex-wrap gap-2 sm:justify-end">
                  <Link
                    href={`/notebooks/${b.id}`}
                    className="rounded border px-3 py-1 text-sm hover:bg-gray-50"
                  >
                    Öffnen
                  </Link>
                  <button className="rounded border px-3 py-1 text-sm hover:bg-gray-50">
                    Entfernen
                  </button>
                </div>
              </li>
            ))}
          </ul>
        </section>

        <section className="rounded-2xl border bg-white p-5 shadow-sm">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h2 className="text-base font-semibold">Allgemeine Scans</h2>
              <p className="text-sm text-gray-500">
                Dateien/Uploads, die keinem Powerbook zugeordnet sind.
              </p>
            </div>
            <button className="inline-flex items-center gap-2 rounded-xl border px-3 py-1.5 text-sm hover:bg-gray-50">
              <ImageIcon className="h-4 w-4" />
              Hinzufügen
            </button>
          </div>

          <ul className="space-y-3">
            {demoScans.length === 0 && (
              <li className="rounded-xl border p-4 text-sm text-gray-500">
                Noch keine Scans vorhanden.
              </li>
            )}

            {demoScans.map((s) => (
              <li
                key={s.id}
                className="flex items-center justify-between rounded-xl border p-3"
              >
                <div className="min-w-0">
                  <div className="truncate text-sm font-medium">{s.title}</div>
                  <div className="text-xs text-gray-500">{s.ts}</div>
                </div>
                <div className="flex gap-2">
                  <button className="rounded border px-3 py-1 text-sm hover:bg-gray-50">
                    Öffnen
                  </button>
                  <button className="rounded border px-3 py-1 text-sm hover:bg-gray-50">
                    Löschen
                  </button>
                </div>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </div>
  );
}
