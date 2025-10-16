// components/NotebookList.tsx
"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

type NotebookItem = { _id?: string; id?: string; title: string };
type ProjectItem  = { _id?: string; id?: string; title: string };

// Optional: kannst du später vom Server füttern, hier laden wir aber clientseitig selbst.
type Props = {
  items: NotebookItem[];
  projects?: ProjectItem[];
};

export default function NotebookList({ items, projects: initialProjects = [] }: Props) {
  const router = useRouter();

  // Tabs
  const [tab, setTab] = useState<"books" | "projects">("books");

  // ---------- Powerbooks (unverändert) ----------
  const [creating, setCreating] = useState(false);

  async function createNotebook(title: string) {
    setCreating(true);
    try {
      const res = await fetch("/api/notebooks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title }),
      });
      if (!res.ok) throw new Error("Create failed");
      router.refresh();
    } finally {
      setCreating(false);
    }
  }

  async function renameNotebook(id: string, title: string) {
    const res = await fetch(`/api/notebooks/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title }),
    });
    if (res.ok) router.refresh();
  }

  async function deleteNotebook(id: string) {
    const res = await fetch(`/api/notebooks/${id}`, { method: "DELETE" });
    if (res.ok) router.refresh();
  }

  // ---------- Projekte (neu: echtes Laden) ----------
  const [projects, setProjects] = useState<ProjectItem[]>(initialProjects);
  const [projectsLoading, setProjectsLoading] = useState(false);
  const [projCreating, setProjCreating] = useState(false);

  async function loadProjects() {
    try {
      setProjectsLoading(true);
      const res = await fetch("/api/projects", { method: "GET", cache: "no-store" });
      if (!res.ok) throw new Error(await res.text());
      const data = (await res.json()) as Array<{ id: string; title: string }>;
      setProjects(data.map((p) => ({ id: p.id, title: p.title })));
    } catch {
      // still show empty state, no hard error-UI
    } finally {
      setProjectsLoading(false);
    }
  }

  // Tab „Projekte“ das erste Mal öffnen -> laden
  useEffect(() => {
    if (tab === "projects" && projects.length === 0 && !projectsLoading) {
      void loadProjects();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab]);

  async function createProject(title: string) {
    setProjCreating(true);
    try {
      const res = await fetch("/api/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title }),
      });
      if (!res.ok) throw new Error("Create project failed");
      await loadProjects(); // direkt neu laden
    } finally {
      setProjCreating(false);
    }
  }

  async function renameProject(id: string, title: string) {
    const res = await fetch(`/api/projects/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title }),
    });
    if (res.ok) await loadProjects();
  }

  async function deleteProject(id: string) {
    const res = await fetch(`/api/projects/${id}`, { method: "DELETE" });
    if (res.ok) await loadProjects();
  }

  return (
    <div className="space-y-4">
      {/* Tabs */}
      <div className="flex items-center gap-2">
        <button
          onClick={() => setTab("books")}
          className={`rounded-xl border px-3 py-1.5 text-sm transition ${
            tab === "books" ? "bg-black text-white border-black" : "bg-white hover:bg-gray-50"
          }`}
        >
          Powerbooks
        </button>
        <button
          onClick={() => setTab("projects")}
          className={`rounded-xl border px-3 py-1.5 text-sm transition ${
            tab === "projects" ? "bg-black text-white border-black" : "bg-white hover:bg-gray-50"
          }`}
        >
          Projekte
        </button>
        <div className="ml-auto" />
      </div>

      {/* Powerbooks (unverändert) */}
      {tab === "books" && (
        <>
          <form
            className="flex gap-2"
            onSubmit={async (e) => {
              e.preventDefault();
              const form = e.currentTarget as HTMLFormElement;
              const title = (new FormData(form).get("title") || "").toString().trim();
              if (!title) return;
              await createNotebook(title);
              (form.elements.namedItem("title") as HTMLInputElement).value = "";
            }}
          >
            <input
              name="title"
              placeholder="Neues Powerbook…"
              className="border rounded px-3 py-2 w-full"
              disabled={creating}
              required
            />
            <button className="bg-black text-white rounded px-3 py-2 disabled:opacity-50" disabled={creating}>
              {creating ? "Erstelle" : "Erstellen"}
            </button>
          </form>

          <ul className="divide-y rounded-2xl border bg-white">
            {items.length === 0 && <li className="p-6 text-gray-500">Noch keine Powerbooks. Leg das erste an!</li>}

            {items.map((n) => {
              const notebookId = (n.id ?? n._id) as string;

              return (
                <li key={notebookId} className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
                  <span className="font-medium">{n.title}</span>

                  <div className="flex flex-wrap gap-2 sm:justify-end">
                    <Link
                      href={`/notebooks/${notebookId}`}
                      className="rounded border px-3 py-1 text-sm hover:bg-black/90 bg-black text-white"
                    >
                      Details
                    </Link>

                    {/* 
                    <button
                      onClick={async () => {
                        const title = prompt("Neuer Titel:", n.title);
                        if (!title) return;
                        await renameNotebook(notebookId, title);
                      }}
                      className="rounded border px-3 py-1 text-sm hover:bg-gray-50"
                    >
                      Umbenennen
                    </button>

                    <button
                      onClick={async () => {
                        if (!confirm("Notebook löschen?")) return;
                        await deleteNotebook(notebookId);
                      }}
                      className="rounded bg-black px-3 py-1 text-sm text-white hover:bg-black/90"
                    >
                      Löschen
                    </button>
                    */}

                    <button
                      onClick={async () => {
                        const from = Number(prompt("Seiten von:", "1") || "1");
                        const to = Number(prompt("…bis:", "10") || "10");
                        if (!from || !to) return;
                        const res = await fetch(`/api/notebooks/${notebookId}/pages/batch`, {
                          method: "POST",
                          headers: { "Content-Type": "application/json" },
                          body: JSON.stringify({ from, to }),
                        });
                        if (res.ok) alert("Seiten erzeugt. QR-Token sind bereit (Route /s/<token>).");
                      }}
                      className="rounded border px-3 py-1 text-sm hover:bg-gray-50"
                    >
                      Seiten erzeugen
                    </button>
                  </div>
                </li>
              );
            })}
          </ul>
        </>
      )}

      {/* Projekte */}
      {tab === "projects" && (
        <>
          <form
            className="flex gap-2"
            onSubmit={async (e) => {
              e.preventDefault();
              const form = e.currentTarget as HTMLFormElement;
              const title = (new FormData(form).get("project_title") || "").toString().trim();
              if (!title) return;
              await createProject(title);
              (form.elements.namedItem("project_title") as HTMLInputElement).value = "";
            }}
          >
            <input
              name="project_title"
              placeholder="Neues Projekt…"
              className="border rounded px-3 py-2 w-full"
              disabled={projCreating}
              required
            />
            <button
              className="bg-black text-white rounded px-3 py-2 disabled:opacity-50"
              disabled={projCreating}
            >
              {projCreating ? "Erstelle" : "Erstellen"}
            </button>
          </form>

          <ul className="divide-y rounded-2xl border bg-white">
            {projectsLoading && projects.length === 0 && (
              <li className="p-6 text-gray-500">Lade Projekte…</li>
            )}

            {!projectsLoading && projects.length === 0 && (
              <li className="p-6 text-gray-500">Noch keine Projekte. Lege dein erstes an!</li>
            )}

            {projects.map((p) => {
              const projectId = (p.id ?? p._id) as string;

              return (
                <li key={projectId} className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
                  <span className="font-medium">{p.title}</span>

                  <div className="flex flex-wrap gap-2 sm:justify-end">
                    <Link
                      href={`/projects/${projectId}`}
                      className="rounded border px-3 py-1 text-sm hover:bg-black/90 bg-black text-white"
                    >
                      Details
                    </Link>

                    {/* <button
                      onClick={async () => {
                        const title = prompt("Neuer Projekttitel:", p.title);
                        if (!title) return;
                        await renameProject(projectId, title);
                      }}
                      className="rounded border px-3 py-1 text-sm hover:bg-gray-50"
                    >
                      Umbenennen
                    </button> */}

                    {/* <button
                      onClick={async () => {
                        if (!confirm("Projekt löschen?")) return;
                        await deleteProject(projectId);
                      }}
                      className="rounded bg-black px-3 py-1 text-sm text-white hover:bg-black/90"
                    >
                      Löschen
                    </button> */}
                  </div>
                </li>
              );
            })}
          </ul>
        </>
      )}
    </div>
  );
}
