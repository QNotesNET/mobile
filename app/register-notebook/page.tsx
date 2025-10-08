// app/register-notebook/page.tsx
"use client";

import { useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";

export default function RegisterNotebookPage() {
  const sp = useSearchParams();
  const router = useRouter();
  const token = sp.get("token") || "";
  const [status, setStatus] = useState<"idle"|"claiming"|"ok"|"error">("idle");
  const [msg, setMsg] = useState<string>("");

  useEffect(() => {
    if (!token) setMsg("Kein Registrierungs-Token gefunden.");
  }, [token]);

  const claim = async () => {
    setStatus("claiming");
    const r = await fetch("/api/notebooks/claim", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token }),
    });
    if (r.ok) {
      setStatus("ok");
      setTimeout(() => router.push("/notebooks"), 900);
    } else {
      const j = await r.json().catch(() => ({}));
      setMsg(j?.error || "Registrierung fehlgeschlagen.");
      setStatus("error");
    }
  };

  return (
    <div className="mx-auto max-w-lg py-12">
      <h1 className="text-2xl font-semibold tracking-tight">Notizbuch registrieren</h1>
      <p className="mt-1 text-sm text-gray-600">
        Dieses Notizbuch deinem Account zuordnen.
      </p>

      <div className="mt-6 rounded-2xl border p-4">
        <div className="text-sm text-gray-700">
          Token: <span className="font-mono">{token || "—"}</span>
        </div>
        <button
          onClick={claim}
          disabled={!token || status === "claiming"}
          className="mt-4 rounded-xl bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-black disabled:opacity-50"
        >
          {status === "claiming" ? "Wird registriert..." : "Notizbuch zuordnen"}
        </button>

        {status === "ok" && <p className="mt-3 text-sm text-green-600">Erfolgreich! Weiterleitung…</p>}
        {status === "error" && <p className="mt-3 text-sm text-red-600">{msg}</p>}
        {!token && <p className="mt-3 text-sm text-red-600">{msg}</p>}
      </div>
    </div>
  );
}
