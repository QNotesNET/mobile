// app/(auth)/forgot-password/ForgotForm.tsx
"use client";

import { useState } from "react";

export default function ForgotForm() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [ok, setOk] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    setLoading(true);
    try {
      const res = await fetch("/api/auth/forgot", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setErr(data?.error || "Fehler beim Anfragen des Passwort-Resets.");
      } else {
        setOk(true);
      }
    } catch (e) {
      setErr("Netzwerkfehler");
    } finally {
      setLoading(false);
    }
  }

  if (ok) {
    return (
      <div className="min-h-screen grid grid-cols-1 lg:grid-cols-2">
        <div className="flex items-center justify-center px-6 py-12 lg:px-20">
          <div className="w-full max-w-sm">
            <img src="/images/logos/logo-black.svg" alt="QNotes" className="h-15 w-auto" />
            <h1 className="mt-8 text-2xl font-bold tracking-tight text-gray-900">Passwort zurücksetzen</h1>
            <p className="mt-4 text-sm text-gray-600">
              Wenn die E-Mail existiert, haben wir Anweisungen zum Zurücksetzen an die Adresse gesendet.
            </p>
            <div className="mt-6">
              <a href="/login" className="inline-block text-sm font-semibold text-black hover:text-black">
                Zurück zum Login
              </a>
            </div>
          </div>
        </div>
        <div className="relative hidden lg:block">
          <img alt="" src="/images/login-image.png" className="absolute inset-0 h-full w-full object-cover" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen grid grid-cols-1 lg:grid-cols-2">
      <div className="flex items-center justify-center px-6 py-12 lg:px-20">
        <div className="w-full max-w-sm">
          <img src="/images/logos/logo-black.svg" alt="QNotes" className="h-15 w-auto" />
          <h1 className="mt-8 text-2xl font-bold tracking-tight text-gray-900">Passwort vergessen</h1>
          <p className="mt-2 text-sm text-gray-600">
            Gib deine E-Mail ein — wir senden einen Link zum Zurücksetzen.
          </p>

          <form onSubmit={onSubmit} className="mt-8 space-y-6">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-900">
                E-Mail
              </label>
              <input
                id="email"
                name="email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="mt-2 block w-full rounded-md border-0 bg-white px-3 py-2 text-gray-900 ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:text-black"
                placeholder="max@mustermann.com"
              />
            </div>

            {err && <p className="text-sm text-red-600">{err}</p>}

            <button
              type="submit"
              disabled={loading}
              className="flex w-full justify-center rounded-md bg-black px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-black/90 disabled:opacity-50"
            >
              {loading ? "Sende…" : "Link senden"}
            </button>
          </form>

          <div className="mt-6">
            <a href="/login" className="text-sm font-semibold text-black hover:text-black">
              Zurück zum Login
            </a>
          </div>
        </div>
      </div>

      <div className="relative hidden lg:block">
        <img alt="" src="/images/login-image.png" className="absolute inset-0 h-full w-full object-cover" />
      </div>
    </div>
  );
}
