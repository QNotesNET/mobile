"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

export default function LoginPage() {
  const r = useRouter();
  const sp = useSearchParams();
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  // nur interne Pfade erlauben
  const rawNext = sp.get("next") || "/";
  const nextUrl = rawNext.startsWith("/") ? rawNext : "/";

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setErr(null);
    setLoading(true);

    const form = new FormData(e.currentTarget);
    const payload = {
      email: String(form.get("email") || ""),
      password: String(form.get("password") || ""),
    };

    const res = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    const data = await res.json().catch(() => ({}));
    setLoading(false);

    if (!res.ok) return setErr(data?.error || "Login fehlgeschlagen");

    r.replace(nextUrl);
  }

  return (
    <main className="max-w-md mx-auto p-6">
      <h1 className="text-2xl font-semibold mb-4">Login</h1>
      <form onSubmit={onSubmit} className="grid gap-3">
        <input name="email" type="email" placeholder="E-Mail" className="border rounded p-2" required />
        <input name="password" type="password" placeholder="Passwort" className="border rounded p-2" required />
        {err && <p className="text-red-600 text-sm">{err}</p>}
        <button disabled={loading} className="bg-black text-white rounded p-2 disabled:opacity-50">
          {loading ? "Lädt..." : "Einloggen"}
        </button>
      </form>
      <p className="text-sm mt-3">
        Neu hier? <a href={`/register?next=${encodeURIComponent(nextUrl)}`} className="underline">Konto erstellen</a>
      </p>
    </main>
  );
}
