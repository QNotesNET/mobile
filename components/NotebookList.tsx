// components/NotebookList.tsx
"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

type NotebookItem = { _id?: string; id?: string; title: string };

export default function NotebookList({ items }: { items: NotebookItem[] }) {
  const router = useRouter();
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

  return (
    <div className="space-y-4">
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
          placeholder="Neues Notebook…"
          className="border rounded px-3 py-2"
          disabled={creating}
          required
        />
        <button className="bg-black text-white rounded px-3 py-2 disabled:opacity-50" disabled={creating}>
          {creating ? "Anlegen…" : "Anlegen"}
        </button>
      </form>

      <ul className="divide-y rounded-2xl border bg-white">
        {items.length === 0 && <li className="p-6 text-gray-500">Noch keine Notebooks. Leg das erste an!</li>}
        {items.map((n) => {
          const id = (n.id ?? n._id) as string;
          return (
            <li key={id} className="flex items-center justify-between p-4">
              <span className="font-medium">{n.title}</span>
              <div className="flex gap-2">
                <button
                  onClick={async () => {
                    const title = prompt("Neuer Titel:", n.title);
                    if (!title) return;
                    await renameNotebook(id, title);
                  }}
                  className="rounded border px-3 py-1 text-sm hover:bg-gray-50"
                >
                  Umbenennen
                </button>
                <button
                  onClick={async () => {
                    if (!confirm("Notebook löschen?")) return;
                    await deleteNotebook(id);
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
    </div>
  );
}
