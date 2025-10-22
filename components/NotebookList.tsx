// components/NotebookList.tsx
"use client";

import { BookOpen } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

type NotebookItem = { _id?: string; id?: string; title: string };
type ProjectItem = { _id?: string; id?: string; title: string };

type Props = {
  items: NotebookItem[];
  projects?: ProjectItem[];
};

export default function NotebookList({
  items,
  projects: initialProjects = [],
}: Props) {
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

  // ---------- Projekte (Clientladen) ----------
  const [projects, setProjects] = useState<ProjectItem[]>(initialProjects);
  const [projectsLoading, setProjectsLoading] = useState(false);
  const [projCreating, setProjCreating] = useState(false);

  async function loadProjects() {
    try {
      setProjectsLoading(true);
      const res = await fetch("/api/projects", {
        method: "GET",
        cache: "no-store",
      });
      if (!res.ok) throw new Error(await res.text());
      const data = (await res.json()) as Array<{ id: string; title: string }>;
      setProjects(data.map((p) => ({ id: p.id, title: p.title })));
    } catch {
      // ruhig bleiben – leerer Zustand reicht
    } finally {
      setProjectsLoading(false);
    }
  }

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
      await loadProjects();
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
      {/* <div className="flex items-center gap-2">
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
      </div> */}

      {/* Powerbooks */}
      {tab === "books" && (
        <>
          {/* <form
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
          </form> */}

          {/* Empty-State Promo statt schnödem Text */}
          {items.length === 0 ? (
            <EmptyPowerbookPromo />
          ) : (
            <ul className="divide-y rounded-2xl border bg-white">
              {items.map((n) => {
                const notebookId = (n.id ?? n._id) as string;

                return (
                  <Link href={`/notebooks/${notebookId}`} key={notebookId}>
                    <li className="flex gap-3 p-4 sm:flex-row lg:items-center lg:justify-between w-full">
                      <span className="font-medium w-full">
                        {n.title}
                      </span>

                      <div className="flex gap-2 sm:justify-end items-center justify-between lg:justify-end">
                        <Link
                          href={`/notebooks/${notebookId}`}
                          className="rounded border px-3 py-1 text-sm hover:bg-black/90 bg-black text-white hidden lg:inline-block"
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

                        {/* <button
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
                      </button> */}
                      </div>
                    </li>
                  </Link>
                );
              })}
            </ul>
          )}
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
              const title = (new FormData(form).get("project_title") || "")
                .toString()
                .trim();
              if (!title) return;
              await createProject(title);
              (
                form.elements.namedItem("project_title") as HTMLInputElement
              ).value = "";
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
              <li className="p-6 text-gray-500">
                Noch keine Projekte. Lege dein erstes an!
              </li>
            )}

            {projects.map((p) => {
              const projectId = (p.id ?? p._id) as string;

              return (
                <li
                  key={projectId}
                  className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between"
                >
                  <span className="font-medium">{p.title}</span>

                  <div className="flex flex-wrap gap-2 sm:justify-end">
                    <Link
                      href={`/projects/${projectId}`}
                      className="rounded border px-3 py-1 text-sm hover:bg-gray-50"
                    >
                      Details
                    </Link>

                    <button
                      onClick={async () => {
                        const title = prompt("Neuer Projekttitel:", p.title);
                        if (!title) return;
                        await renameProject(projectId, title);
                      }}
                      className="rounded border px-3 py-1 text-sm hover:bg-gray-50"
                    >
                      Umbenennen
                    </button>

                    <button
                      onClick={async () => {
                        if (!confirm("Projekt löschen?")) return;
                        await deleteProject(projectId);
                      }}
                      className="rounded bg-black px-3 py-1 text-sm text-white hover:bg-black/90"
                    >
                      Löschen
                    </button>
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

/* ---------------- Empty-State Promo für Powerbooks ---------------- */

function EmptyPowerbookPromo() {
  const checkoutUrl =
    process.env.NEXT_PUBLIC_POWERBOOK_CHECKOUT_URL || "/pricing";

  return (
    <section className="rounded-2xl border bg-white p-5 shadow-sm mb-16">
      <div className="flex flex-col gap-6 md:flex-row md:items-center">
        {/* Bild / Illustration */}
        <div className="mx-auto w-full max-w-sm overflow-hidden rounded-xl border bg-gray-50">
          <img
            src="/images/promo-2.png"
            alt="Powerbook"
            className="h-full w-full object-cover"
          />
        </div>

        {/* Text + CTA */}
        <div className="flex-1">
          <h3 className="text-lg font-semibold">Hol dir dein Powerbook</h3>
          <p className="mt-2 text-sm text-gray-600">
            Scanne Seiten blitzschnell, verknüpfe Notizen mit Projekten und
            arbeite digital weiter. Mit dem Powerbook schaltest du die komplette
            Experience frei – inklusive digitaler Ansicht, automatischer
            Seitenerkennung und Export.
          </p>

          <ul className="mt-4 grid gap-2 text-sm text-gray-700">
            <li className="flex items-center gap-2">
              <span className="inline-block h-1.5 w-1.5 rounded-full bg-black" />
              Digitale Ansicht & Seitenfortschritt
            </li>
            <li className="flex items-center gap-2">
              <span className="inline-block h-1.5 w-1.5 rounded-full bg-black" />
              Automatische Seitenerkennung beim Scannen
            </li>
            <li className="flex items-center gap-2">
              <span className="inline-block h-1.5 w-1.5 rounded-full bg-black" />
              Export als PDF/JPG/PNG
            </li>
          </ul>

          <div className="mt-5 flex flex-wrap items-center gap-3">
            <a
              href={checkoutUrl}
              className="inline-flex items-center rounded-xl bg-black px-4 py-2 text-sm font-medium text-white hover:bg-black/90"
            >
              Powerbook jetzt holen
            </a>
            <a
              href="/demo"
              className="inline-flex items-center rounded-xl border px-4 py-2 text-sm hover:bg-gray-50"
            >
              Mehr erfahren
            </a>
          </div>

          <p className="mt-2 text-xs text-gray-400">
            link muass nu geändert werdn zum kafm (env:{" "}
            <code>NEXT_PUBLIC_POWERBOOK_CHECKOUT_URL</code>).
          </p>
        </div>
      </div>
    </section>
  );
}
