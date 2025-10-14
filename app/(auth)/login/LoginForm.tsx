"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Image from "next/image";

export default function LoginForm() {
  const router = useRouter();
  const sp = useSearchParams();
  const rawNext = sp.get("next") || "/";
  const nextUrl = rawNext.startsWith("/") ? rawNext : "/";

  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

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
    router.replace(nextUrl);
  }

  return (
    <div className="min-h-screen grid grid-cols-1 lg:grid-cols-2">
      {/* Linke Hälfte: Formular, vertikal zentriert */}
      <div className="flex items-center justify-center px-6 py-12 lg:px-20">
        <div className="w-full max-w-sm">
          <Image
            alt="Powerbook"
            src="/images/logos/logo-black.svg"
            width={160}
            height={80}
            priority
            className="h-20 w-auto"
          />
          <h1 className="mt-8 text-2xl font-bold tracking-tight text-gray-900">
            Bei Powerbook anmelden
          </h1>
          <p className="mt-2 text-sm text-gray-600">
            Neu hier?{" "}
            <a
              href={`/register?next=${encodeURIComponent(nextUrl)}`}
              className="font-semibold text-black hover:text-black"
            >
              Konto erstellen
            </a>
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
                autoComplete="email"
                placeholder="max@mustermann.com"
                className="mt-2 block w-full rounded-md border-0 bg-white px-3 py-2 text-gray-900 ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:text-black"
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-900">
                Passwort
              </label>
              <input
                id="password"
                name="password"
                type="password"
                required
                autoComplete="current-password"
                placeholder="••••••••"
                className="mt-2 block w-full rounded-md border-0 bg-white px-3 py-2 text-gray-900 ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:text-black"
              />
            </div>

            <div className="flex items-center justify-between">
              <label className="flex items-center gap-2 text-sm text-gray-900">
                <input
                  type="checkbox"
                  className="size-4 rounded border-gray-300 text-black focus:text-black"
                />
                Angemeldet bleiben
              </label>
              <a href="/forgot-password" className="text-sm font-semibold text-black hover:text-black">
                Passwort vergessen?
              </a>
            </div>

            {err && <p className="text-sm text-red-600">{err}</p>}

            <button
              type="submit"
              disabled={loading}
              className="flex w-full justify-center rounded-md bg-black px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-black/90 disabled:opacity-50"
            >
              {loading ? "Lädt…" : "Einloggen"}
            </button>
          </form>
        </div>
      </div>

      {/* Rechte Hälfte: Bild (50%) */}
      <div className="relative hidden lg:block">
        <Image
          alt=""
          src="/images/login-image.png"
          fill
          sizes="(min-width:1024px) 50vw, 0vw"
          className="object-cover"
          priority
        />
      </div>
    </div>
  );
}
