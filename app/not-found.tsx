// app/not-found.tsx
"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";

export default function NotFound() {
  const router = useRouter();

  return (
    <main className="relative flex min-h-screen items-center justify-center bg-white px-6">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-40 [background:radial-gradient(60rem_60rem_at_120%_-10%,#0000000d,transparent),radial-gradient(40rem_40rem_at_-10%_120%,#0000000a,transparent)]"
      />
      <div className="relative w-full max-w-lg text-center">
        <div className="mb-3 text-7xl font-bold leading-none tracking-tight text-gray-900">
          404
        </div>
        <h1 className="text-3xl font-semibold tracking-tight text-gray-900">
          Seite nicht gefunden
        </h1>
        <p className="mt-2 text-sm leading-6 text-gray-600">
          Die angeforderte Seite existiert nicht oder wurde verschoben.
        </p>

        <div className="mt-6 flex items-center justify-center gap-3">
          <Link
            href="/"
            className="inline-flex items-center justify-center rounded-xl bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-black"
          >
            Zurück zum Dashboard
          </Link>
        </div>
      </div>
    </main>
  );
}
