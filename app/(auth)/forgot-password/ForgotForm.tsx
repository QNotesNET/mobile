"use client";

import { useState } from "react";
import { useSearchParams } from "next/navigation";

export default function ForgotForm() {
  const sp = useSearchParams();
  const nextUrl = sp.get("next") || "/";

  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [ok, setOk] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setErr(null);
    setBusy(true);

    const res = await fetch("/api/auth/forgot", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
    });

    setBusy(false);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setErr(data?.error || "Fehler");
      return;
    }
    setOk(true);
  }

  return (
    <div className="min-h-screen grid grid-cols-1 lg:grid-cols-2">
      {/* Linke Hälfte: Formular */}
      <div className="flex items-center justify-center px-6 py-12 lg:px-20">
        <div className="w-full max-w-sm">
          <img src="/images/logos/logo-black.svg" alt="Powerbook" className="h-20 w-auto" />
          <h1 className="mt-8 text-2xl font-bold tracking-tight text-gray-900">
            Passwort zurücksetzen
          </h1>
          <p className="mt-2 text-sm text-gray-600">
            Gib deine E-Mail an. Wir senden dir – falls vorhanden – einen Link zum Zurücksetzen.
          </p>

          {ok ? (
            <div className="mt-6 rounded-md bg-green-50 p-3 text-sm text-green-800">
              Wenn die E-Mail existiert, wurde eine Nachricht versendet. Bitte prüfe dein Postfach.
            </div>
          ) : (
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
                  autoFocus
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="mt-2 block w-full rounded-md border-0 bg-white px-3 py-2 text-gray-900 ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2"
                />
              </div>

              {err && <p className="text-sm text-red-600">{err}</p>}

              <button
                type="submit"
                disabled={busy}
                className="flex w-full justify-center rounded-md bg-black px-3 py-2 text-sm font-semibold text-white hover:bg-black/90 disabled:opacity-50"
              >
                {busy ? "Sende…" : "Link anfordern"}
              </button>
            </form>
          )}

          <p className="mt-6 text-sm text-gray-600">
            Zurück zum Login?{" "}
            <a href={`/login?next=${encodeURIComponent(nextUrl)}`} className="font-semibold text-black">
              Anmelden
            </a>
          </p>
        </div>
      </div>

      {/* Rechte Hälfte: Bild */}
      <div className="relative hidden lg:block">
        <img
          alt=""
          src="/images/login-image.png"
          className="absolute inset-0 h-full w-full object-cover"
        />
      </div>
    </div>
  );
}
