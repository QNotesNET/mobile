"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Image from "next/image";

export default function RegisterForm() {
  const r = useRouter();
  const sp = useSearchParams();
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const rawNext = sp.get("next") || "/";
  const nextUrl = rawNext.startsWith("/") ? rawNext : "/";

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setErr(null);
    setLoading(true);

    const form = new FormData(e.currentTarget);
    const payload = {
      firstName: String(form.get("firstName") || ""),
      lastName: String(form.get("lastName") || ""),
      email: String(form.get("email") || ""),
      password: String(form.get("password") || ""),
    };

    const res = await fetch("/api/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    const data = await res.json().catch(() => ({}));
    setLoading(false);
    if (!res.ok) return setErr(data?.error || "Fehler bei der Registrierung");

    r.replace(nextUrl);
  }

  return (
    <main className="min-h-dvh grid place-items-center p-6">
      <div className="w-full max-w-md bg-white rounded-2xl shadow p-6">
        <div className="flex items-center justify-center gap-3 mb-5">
          <Image src="/images/logos/logo-black.svg" alt="QNotes" width={130} height={35} />
        </div>
        <h1 className="text-2xl font-semibold mb-4 text-center">Konto erstellen</h1>
        <form onSubmit={onSubmit} className="grid gap-3">
          <div className="grid grid-cols-2 gap-3">
            <input name="firstName" placeholder="Vorname" className="border rounded p-2" required />
            <input name="lastName" placeholder="Nachname" className="border rounded p-2" required />
          </div>
          <input name="email" type="email" placeholder="E-Mail" className="border rounded p-2" required />
          <input name="password" type="password" placeholder="Passwort (min. 8 Zeichen)" className="border rounded p-2" required />
          {err && <p className="text-red-600 text-sm">{err}</p>}
          <button disabled={loading} className="bg-black text-white rounded p-2 disabled:opacity-50">
            {loading ? "Lädt..." : "Registrieren"}
          </button>
        </form>
        <p className="text-sm mt-3 text-center">
          Schon ein Konto? <a href={`/login?next=${encodeURIComponent(nextUrl)}`} className="underline">Einloggen</a>
        </p>
      </div>
    </main>
  );
}
