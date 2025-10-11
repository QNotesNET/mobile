// app/register-notebook/page.tsx
"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";

type ClaimOk = { ok: true };
type ClaimErr = { ok: false; error?: string };

export default function RegisterNotebookPage() {
  const router = useRouter();
  const params = useSearchParams();

  const notebookId = params.get("notebookId") ?? "";
  const token = params.get("token") ?? "";

  const [status, setStatus] = useState<"idle" | "working" | "done" | "error">("idle");
  const [message, setMessage] = useState<string>("");

  useEffect(() => {
    if (params.get("auto") === "1" && (notebookId || token)) {
      void handleClaim();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleClaim() {
    try {
      setStatus("working");
      setMessage("");

      const res = await fetch("/api/notebooks/claim", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          notebookId: notebookId || undefined,
          claimToken: token || undefined,
        }),
      });

      const data: ClaimOk | ClaimErr = await res.json();

      if (!res.ok || !("ok" in data) || data.ok !== true) {
        const reason = "error" in data && data.error ? data.error : `HTTP_${res.status}`;
        throw new Error(reason);
      }

      setStatus("done");
      setMessage("Notizbuch erfolgreich zugewiesen. Weiterleitung …");
      setTimeout(() => router.replace("/notebooks"), 800);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Unbekannter Fehler";
      setStatus("error");
      setMessage(`Zuweisung fehlgeschlagen: ${msg}`);
      console.error("[register-notebook] claim failed", e);
    }
  }

  const disabled = status === "working";

  return (
    <main className="mx-auto max-w-md px-4 py-10">
      <h1 className="text-2xl font-semibold">Notizbuch zuweisen</h1>
      <p className="text-sm text-gray-500 mt-1">Dieses Notizbuch wird deinem Account zugeordnet.</p>

      <div className="mt-6 space-y-3">
        <div className="text-sm">
          <div>
            <span className="font-medium">Notebook ID:</span> {notebookId || "—"}
          </div>
          <div>
            <span className="font-medium">Claim Token:</span> {token || "—"}
          </div>
        </div>

        <button
          onClick={handleClaim}
          disabled={disabled || (!notebookId && !token)}
          className={`w-full rounded-xl px-4 py-2 text-white ${disabled ? "bg-gray-400" : "bg-gray-900 hover:bg-black"}`}
        >
          {status === "working" ? "Wird zugewiesen …" : "Jetzt zuweisen"}
        </button>

        {message && (
          <div
            className={`rounded-xl border px-3 py-2 text-sm ${
              status === "error"
                ? "border-red-300 text-red-700 bg-red-50"
                : "border-green-300 text-green-700 bg-green-50"
            }`}
          >
            {message}
          </div>
        )}
      </div>
    </main>
  );
}
