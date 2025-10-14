// components/UploadForm.tsx
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function UploadForm({ pageId }: { pageId: string }) {
  const [busy, setBusy] = useState(false);
    const [text, setText] = useState<string>("");

  const r = useRouter();

    async function OpenAIScan() {
    try {
      const r = await fetch("/api/openai", { method: "POST" });
      if (!r.ok) throw new Error("API error");
      const { text } = await r.json();
      setText(text);
      console.log(text);
    } catch (e) {
      console.error(e);
    }
  }

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();

    // 👇 stabile Referenz auf das Formular holen (Fix für .reset() nach async)
    const form = e.currentTarget;
    const input = (form.elements.namedItem("file") as HTMLInputElement) || null;

    const file = input?.files?.[0];
    if (!file) return alert("Bitte eine Datei auswählen.");

    setBusy(true);
    try {
      // 1) Presign holen (WICHTIG: pageId, fileName, contentType mitschicken)
      const presignRes = await fetch("/api/uploads/presign", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          pageId,
          fileName: file.name,
          contentType: file.type || "application/octet-stream",
        }),
      });

      if (!presignRes.ok) {
        const err = await presignRes.json().catch(() => ({}));
        console.error("presign failed", err);
        return alert(err?.error || "Presign fehlgeschlagen (400).");
      }

      const { uploadUrl, publicUrl, key } = await presignRes.json();

      // 2) Direkt zu S3 PUTten
      const putRes = await fetch(uploadUrl, {
        method: "PUT",
        headers: { "Content-Type": file.type || "application/octet-stream" },
        body: file,
      });

      if (!putRes.ok) {
        console.error("s3 put failed", await putRes.text());
        return alert("Upload zu S3 fehlgeschlagen.");
      }

      // 3) In unserer DB an die Seite hängen
      const saveRes = await fetch(`/api/pages/${pageId}/images`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: publicUrl, key }),
      });

      // OPENAI SCAN
      console.log("Scanning AI")
        const aiRes = await fetch("/api/openai", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ imageUrl: publicUrl }),
        });
        console.log("Scan progress")
        if (!aiRes.ok) {
          console.error("openai scan failed", await aiRes.text());
        } else {
          console.log("Scan")
          const { text: ocrText } = await aiRes.json();
          setText(ocrText || "");
          console.log("OCR:", ocrText);
        }


      if (!saveRes.ok) {
        const err = await saveRes.json().catch(() => ({}));
        console.error("save image failed", err);
        return alert(err?.error || "Speichern des Bildes fehlgeschlagen.");
      }

      alert("Upload erfolgreich!");
      r.refresh();
    } catch (e) {
      console.error(e);
      alert("Upload fehlgeschlagen");
    } finally {
      setBusy(false);
      form?.reset(); // 👈 statt e.currentTarget.reset()
    }
  }

  return (
    <form onSubmit={onSubmit} className="grid gap-3 border rounded-xl p-4">
      <input type="file" name="file" accept="image/*" required />
      <button className="bg-black text-white rounded px-3 py-2 disabled:opacity-50" disabled={busy}>
        {busy ? "Hochladen…" : "Hochladen"}
      </button>
            <p>{text}</p>

    </form>
  );
}
