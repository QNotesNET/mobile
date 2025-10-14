"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

export default function ResetForm() {
  const sp = useSearchParams();
  const token = sp.get("token") || "";
  const router = useRouter();

  const [pw, setPw] = useState("");
  const [busy, setBusy] = useState(false);
  const [ok, setOk] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setErr(null);
    setBusy(true);

    const res = await fetch("/api/auth/reset", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token, password: pw }),
    });

    setBusy(false);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setErr(data?.error || "Fehler");
      return;
    }
    setOk(true);
    setTimeout(() => router.replace("/login"), 1200);
  }

  return (
    <div className="min-h-screen grid grid-cols-1 lg:grid-cols-2">
      <div className="flex items-center justify-center px-6 py-12 lg:px-20">
        <div className="w-full max-w-sm">
          <img src="/images/logos/logo-black.svg" alt="Powerbook" className="h-20 w-auto" />
          <h1 className="mt-8 text-2xl font-bold tracking-tight text-gray-900">
            Neues Passwort setzen
          </h1>
          {!token && (
            <p className="mt-2 text-sm text-red-600">
              Ungültiger Aufruf – es fehlt der Token. Bitte den Link aus der E-Mail verwenden.
            </p>
          )}

          {ok ? (
            <div className="mt-6 rounded-md bg-green-50 p-3 text-sm text-green-800">
              Passwort aktualisiert. Du wirst zum Login weitergeleitet…
            </div>
          ) : (
            <form onSubmit={onSubmit} className="mt-8 space-y-6">
              <div>
                <label htmlFor="pw" className="block text-sm font-medium text-gray-900">
                  Neues Passwort
                </label>
                <input
                  id="pw"
                  name="pw"
                  type="password"
                  minLength={8}
                  required
                  disabled={!token}
                  value={pw}
                  onChange={(e) => setPw(e.target.value)}
                  placeholder="Mind. 8 Zeichen"
                  className="mt-2 block w-full rounded-md border-0 bg-white px-3 py-2 text-gray-900 ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2"
                />
              </div>

              {err && <p className="text-sm text-red-600">{err}</p>}

              <button
                type="submit"
                disabled={busy || !token}
                className="flex w-full justify-center rounded-md bg-black px-3 py-2 text-sm font-semibold text-white hover:bg-black/90 disabled:opacity-50"
              >
                {busy ? "Speichere…" : "Passwort speichern"}
              </button>
            </form>
          )}
        </div>
      </div>

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
