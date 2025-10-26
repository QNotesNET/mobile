"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";

export default function NotebookPagesActions({ notebookId }: { notebookId: string }) {
  const r = useRouter();
  const [busy, setBusy] = useState(false);

  async function createBatch() {
    const from = Number(prompt("Seiten von:", "1") || "1");
    const to = Number(prompt("…bis:", "10") || "10");
    if (!from || !to) return;

    setBusy(true);
    try {
      const res = await fetch(`/api/notebooks/${notebookId}/pages/batch`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ from, to }),
      });
      if (!res.ok) throw new Error("Batch failed");
      r.refresh();
      toast.success("Seiten erzeugt. Scannen über /s/<token> möglich.");
    } catch {
      toast.error("Erzeugen fehlgeschlagen");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex gap-2">
      <button
        onClick={createBatch}
        disabled={busy}
        className="rounded border px-3 py-2 text-sm hover:bg-gray-50 disabled:opacity-50"
      >
        Seiten erzeugen
      </button>
    </div>
  );
}
