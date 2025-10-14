"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Image from "next/image";

export default function RegisterForm() {
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
            width={120}
            height={36}
            priority
            className="h-20 w-auto"
          />
          <h1 className="mt-8 text-2xl font-bold tracking-tight text-gray-900">
            Konto erstellen
          </h1>
          <p className="mt-2 text-sm text-gray-600">
            Schon ein Konto?{" "}
            <a
              href={`/login?next=${encodeURIComponent(nextUrl)}`}
              className="font-semibold text-black hover:text-black"
            >
              Einloggen
            </a>
          </p>

          <form onSubmit={onSubmit} className="mt-8 space-y-6">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label
                  htmlFor="firstName"
                  className="block text-sm font-medium text-gray-900"
                >
                  Vorname
                </label>
                <input
                  id="firstName"
                  name="firstName"
                  type="text"
                  required
                  autoFocus
                  placeholder="Max"
                  className="mt-2 block w-full rounded-md border-0 bg-white px-3 py-2 text-gray-900 ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-indigo-600"
                />
              </div>
              <div>
                <label
                  htmlFor="lastName"
                  className="block text-sm font-medium text-gray-900"
                >
                  Nachname
                </label>
                <input
                  id="lastName"
                  name="lastName"
                  type="text"
                  required
                  placeholder="Mustermann"
                  className="mt-2 block w-full rounded-md border-0 bg-white px-3 py-2 text-gray-900 ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-indigo-600"
                />
              </div>
            </div>

            <div>
              <label
                htmlFor="email"
                className="block text-sm font-medium text-gray-900"
              >
                E-Mail
              </label>
              <input
                id="email"
                name="email"
                type="email"
                required
                autoComplete="email"
                placeholder="max@mustermann.com"
                className="mt-2 block w-full rounded-md border-0 bg-white px-3 py-2 text-gray-900 ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-indigo-600"
              />
            </div>

            <div>
              <label
                htmlFor="password"
                className="block text-sm font-medium text-gray-900"
              >
                Passwort
              </label>
              <input
                id="password"
                name="password"
                type="password"
                required
                minLength={8}
                autoComplete="new-password"
                placeholder="Mind. 8 Zeichen"
                className="mt-2 block w-full rounded-md border-0 bg-white px-3 py-2 text-gray-900 ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-indigo-600"
              />
            </div>

            {err && <p className="text-sm text-red-600">{err}</p>}

            <button
              type="submit"
              disabled={loading}
              className="flex w-full justify-center rounded-md bg-black px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-black/90 disabled:opacity-50"
            >
              {loading ? "Lädt…" : "Registrieren"}
            </button>
          </form>
        </div>
      </div>

      {/* Rechte Hälfte: Bild (50%) */}
      <div className="relative hidden lg:block">
        <Image
          alt=""
          src="/images/register-image.png"
          fill
          sizes="(min-width:1024px) 50vw, 0vw"
          className="object-cover"
          priority
        />
      </div>
    </div>
  );
}
