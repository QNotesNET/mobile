// components/NotebookList.tsx
"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

type NotebookItem = { _id?: string; id?: string; title: string };
type ProjectItem = { _id?: string; id?: string; title: string };

type Props = {
  items: NotebookItem[];
  projects?: ProjectItem[];
};

export default function ClientScan({
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

  return (
    <div className="space-y-4">
      {/* Powerbooks */}
      {tab === "books" && (
        <>
          {/* Empty-State Promo statt schnödem Text */}
          {items.length === 0 ? (
            <EmptyPowerbookPromo />
          ) : (
            <ul className="divide-y rounded-2xl border bg-white">
              {items.map((n) => {
                const notebookId = (n.id ?? n._id) as string;

                return (
                  <li
                    key={notebookId}
                    className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <Link href={`/scan/${notebookId}?notebookId=${notebookId}`}>
                      <span className="font-medium">{n.title}</span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
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
    <section className="rounded-2xl border bg-white p-5 shadow-sm">
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
