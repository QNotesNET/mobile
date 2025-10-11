// /app/qr/page.tsx
"use client";

import { useState } from "react";
import QRCode from "qrcode";

type GenState =
  | { status: "idle" }
  | { status: "working" }
  | { status: "done"; token: string; url: string; dataUrl?: string }
  | { status: "error"; message: string };

export default function QRPage() {
  const [notebookId, setNotebookId] = useState("");
  const [state, setState] = useState<GenState>({ status: "idle" });

  async function handleGenerate(e?: React.MouseEvent<HTMLButtonElement>) {
    e?.preventDefault();

    const id = notebookId.trim();
    if (!id) {
      setState({ status: "error", message: "Bitte eine Notebook ID eingeben." });
      return;
    }

    try {
      setState({ status: "working" });

      // 1) Token erzeugen & im Notebook speichern (API gibt token + url zurück)
      const res = await fetch(`/api/qr/single?notebookId=${encodeURIComponent(id)}`);
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data?.token || !data?.url) {
        throw new Error(data?.error || `Fehler beim Erzeugen des Tokens (HTTP ${res.status})`);
      }

      // 2) QR-Bild erzeugen (DataURL)
      const dataUrl = await QRCode.toDataURL(String(data.url), {
        errorCorrectionLevel: "M",
        margin: 2,
        scale: 6,
      });

      setState({ status: "done", token: data.token, url: data.url, dataUrl });
    } catch (err: any) {
      setState({ status: "error", message: err?.message || "Unbekannter Fehler" });
      console.error("[QR] generate failed", err);
    }
  }

  const disabled = state.status === "working";

  return (
    <main className="mx-auto max-w-2xl px-4 py-10">
      <h1 className="text-2xl font-semibold">QR-Code erzeugen</h1>
      <p className="text-sm text-gray-500 mt-1">
        Erzeuge einen einmaligen Claim-Link für ein Notizbuch.
      </p>

      <form
        className="mt-6 space-y-4"
        onSubmit={(e) => {
          e.preventDefault();
          void handleGenerate();
        }}
      >
        <label className="block text-sm font-medium">
          Notebook ID
          <input
            value={notebookId}
            onChange={(e) => setNotebookId(e.target.value)}
            placeholder="z. B. 68ea6812eab8b6ec146b0b8f"
            className="mt-1 w-full rounded-xl border px-3 py-2"
          />
        </label>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={handleGenerate}
            disabled={disabled}
            className={`rounded-xl px-4 py-2 text-white ${
              disabled ? "bg-gray-400" : "bg-gray-900 hover:bg-black"
            }`}
          >
            {disabled ? "Erzeuge…" : "QR-Code generieren"}
          </button>
        </div>
      </form>

      {state.status === "done" && (
        <section className="mt-8 space-y-3">
          <div className="rounded-xl border p-4">
            <div className="text-sm">
              <div className="mb-1">
                <span className="font-medium">Token:</span>{" "}
                <code className="break-all">{state.token}</code>
              </div>
              <div className="mb-3">
                <span className="font-medium">URL:</span>{" "}
                <a
                  href={state.url}
                  className="text-blue-600 underline break-all"
                  target="_blank"
                  rel="noreferrer"
                >
                  {state.url}
                </a>
              </div>
              {state.dataUrl && (
                <div className="flex items-start gap-6">
                  <img
                    src={state.dataUrl}
                    alt="QR Code"
                    className="h-48 w-48 rounded-lg border bg-white"
                  />
                  <div className="space-y-2">
                    <a
                      href={state.dataUrl}
                      download={`qnotes-${notebookId}.png`}
                      className="inline-block rounded-xl bg-gray-900 px-3 py-2 text-white hover:bg-black"
                    >
                      PNG herunterladen
                    </a>
                    <p className="text-xs text-gray-500">
                      Scannen führt zu <span className="font-mono">{state.url}</span>
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </section>
      )}

      {state.status === "error" && (
        <div className="mt-6 rounded-xl border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-700">
          {state.message}
        </div>
      )}
    </main>
  );
}
