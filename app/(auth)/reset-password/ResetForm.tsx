"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";

export default function ResetForm() {
  const router = useRouter();
  const sp = useSearchParams();

  const token = sp.get("token") || "";
  const [password, setPassword] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [ok, setOk] = useState(false);
  const [loading, setLoading] = useState(false);

  const rawNext = sp.get("next") || "/";
  const nextUrl = rawNext.startsWith("/") ? rawNext : "/";

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setErr(null);
    setLoading(true);

    const res = await fetch("/api/auth/reset", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token, password }),
    });

    const data = await res.json().catch(() => ({}));
    setLoading(false);

    if (!res.ok) {
      setErr(data?.error || "Fehler beim Zurücksetzen");
      return;
    }

    setOk(true);
    // kleiner Delay, dann rein ins Dashboard (oder nextUrl)
    setTimeout(() => router.replace(nextUrl), 1000);
  }

  // No/invalid token in URL (UI-only check; server prüft sowieso)
  if (!token) {
    return (
      <div className="min-h-screen grid grid-cols-1 lg:grid-cols-2">
        {/* Left: info */}
        <div className="flex items-center justify-center px-6 py-12 lg:px-20">
          <div className="w-full max-w-sm">
            <img alt="QNotes" src="/images/logos/logo-black.svg" className="h-15 w-auto" />
            <h1 className="mt-8 text-2xl font-bold tracking-tight text-gray-900">
              Passwort zurücksetzen
            </h1>
            <p className="mt-2 text-sm text-gray-600">
              Der Link ist ungültig. Bitte fordere einen neuen Link an.
            </p>
            <a href="/forgot-password" className="mt-6 inline-block text-sm font-semibold text-black">
              Zur „Passwort vergessen“-Seite
            </a>
          </div>
        </div>

        {/* Right: image */}
        <div className="relative hidden lg:block">
          <img
            alt=""
            src="/images/register-image.png"
            className="absolute inset-0 h-full w-full object-cover"
          />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen grid grid-cols-1 lg:grid-cols-2">
      {/* Left: form */}
      <div className="flex items-center justify-center px-6 py-12 lg:px-20">
        <div className="w-full max-w-sm">
          <img alt="QNotes" src="/images/logos/logo-black.svg" className="h-15 w-auto" />
          <h1 className="mt-8 text-2xl font-bold tracking-tight text-gray-900">
            Neues Passwort festlegen
          </h1>
          <p className="mt-2 text-sm text-gray-600">
            Wähle ein sicheres Passwort (mind. 8 Zeichen).
          </p>

          <form onSubmit={onSubmit} className="mt-8 space-y-6">
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-900">
                Neues Passwort
              </label>
              <input
                id="password"
                name="password"
                type="password"
                required
                minLength={8}
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="mt-2 block w-full rounded-md border-0 bg-white px-3 py-2 text-gray-900 ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2"
              />
            </div>

            {err && <p className="text-sm text-red-600">{err}</p>}
            {ok && <p className="text-sm text-green-600">Passwort geändert. Weiterleitung…</p>}

            <button
              type="submit"
              disabled={loading}
              className="flex w-full justify-center rounded-md bg-black px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-black/90 disabled:opacity-50"
            >
              {loading ? "Speichere…" : "Passwort speichern"}
            </button>
          </form>
        </div>
      </div>

      {/* Right: image (same look as login/register) */}
      <div className="relative hidden lg:block">
        <img
          alt=""
          src="/images/register-image.png"
          className="absolute inset-0 h-full w-full object-cover"
        />
      </div>
    </div>
  );
}
