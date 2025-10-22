/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import Image from "next/image";

type ClaimOk = { ok: true };
type ClaimErr = { ok: false; error?: string };

export default function RegisterNotebookPage() {
  const router = useRouter();
  const params = useSearchParams();

  const notebookId = params.get("notebookId") ?? "";
  const token = params.get("token") ?? "";

  const [status, setStatus] = useState<"idle" | "working" | "done" | "error">("idle");
  const [message, setMessage] = useState<string>("");
  const [title, setTitle] = useState<string>(""); // ⇦ NEU (Titel vom Input)

  useEffect(() => {
    if (params.get("auto") === "1" && (notebookId || token)) {
      void handleClaim(); // auto-claim (Titel bleibt optional)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleClaim() {
    try {
      setStatus("working");
      setMessage("");

      const res = await fetch("/api/notebooks/claim", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          notebookId: notebookId || undefined,
          claimToken: token || undefined,
          // ⇩ nur mitsenden, wenn nicht leer
          title: title && title.trim().length ? title.trim() : undefined,
        }),
      });

      const data: ClaimOk | ClaimErr = await res.json();

      if (!res.ok || !("ok" in data) || data.ok !== true) {
        const reason = "error" in data && data.error ? data.error : `HTTP_${res.status}`;
        throw new Error(reason);
      }

      setStatus("done");
      setMessage("Notizbuch erfolgreich zugewiesen. Weiterleitung …");
      setTimeout(() => router.replace("/notebooks"), 800);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Unbekannter Fehler";
      setStatus("error");
      setMessage(`Zuweisung fehlgeschlagen: ${msg}`);
      console.error("[register-notebook] claim failed", e);
    }
  }

  const disabled = status === "working";

  return (
    <div className="min-h-screen grid grid-cols-1 lg:grid-cols-2">
      {/* Linke Hälfte */}
      <div className="flex items-center justify-center px-6 py-12 lg:px-20">
        <div className="w-full max-w-sm flex flex-col justify-center items-center lg:items-start">
          <Image
            alt="Powerbook"
            src="/images/logos/logo-black.svg"
            width={160}
            height={80}
            priority
            className="h-20 w-auto"
          />
          <h1 className="mt-8 text-2xl text-center lg:text-left font-bold tracking-tight text-gray-900">
            Powerbook verbinden
          </h1>
          <p className="mt-2 text-sm text-gray-600 text-center lg:text-left">
            Dieses Powerbook wird deinem Account zugeordnet.
          </p>

          {/* ⇩ kontrolliertes Textfeld – wird beim Claim mitgesendet */}
          <input
            name="title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Benenne dein Powerbook"
            className="border rounded px-3 py-2 w-full mt-4"
          />

          <button
            onClick={handleClaim}
            disabled={disabled || (!notebookId && !token)}
            className={`w-full rounded-xl mt-10 px-4 py-2 text-white cursor-pointer ${
              disabled ? "bg-gray-400" : "bg-gray-900 hover:bg-black"
            }`}
          >
            {status === "working" ? "Wird zugewiesen …" : "Jetzt zuweisen"}
          </button>

          {message && (
            <div
              className={`rounded-xl border px-3 py-2 text-sm mt-4 text-center lg:text-left ${
                status === "error"
                  ? "border-red-300 text-red-700 bg-red-50"
                  : "border-green-300 text-green-700 bg-green-50"
              }`}
            >
              {message}
            </div>
          )}
        </div>
      </div>

      {/* Rechte Hälfte: Bild */}
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
