"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function UploadForm({ pageId }: { pageId: string }) {
  const [busy, setBusy] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const router = useRouter();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!file) return;

    setBusy(true);
    try {
      // 1) presign
      const presignRes = await fetch("/api/uploads/presign", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          filename: file.name,
          contentType: file.type || "application/octet-stream",
          prefix: "scans", // optional, groups objects
        }),
      });
      if (!presignRes.ok) throw new Error("presign failed");
      const { uploadUrl, publicUrl } = await presignRes.json();

      // 2) direct PUT to S3
      const putRes = await fetch(uploadUrl, {
        method: "PUT",
        headers: { "Content-Type": file.type || "application/octet-stream" },
        body: file,
      });
      if (!putRes.ok) throw new Error("upload failed");

      // 3) tell our API to save the URL on the Page
      const saveRes = await fetch(`/api/pages/${pageId}/images`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: publicUrl }),
      });
      if (!saveRes.ok) throw new Error("save failed");

      setFile(null);
      router.refresh();
      alert("Upload erfolgreich");
    } catch (err) {
      console.error(err);
      alert("Upload fehlgeschlagen");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form className="grid gap-3 border rounded-xl p-4" onSubmit={handleSubmit}>
      <input
        type="file"
        name="file"
        accept="image/*"
        onChange={(e) => setFile(e.currentTarget.files?.[0] ?? null)}
        required
      />
      <button className="bg-black text-white rounded px-3 py-2 disabled:opacity-50" disabled={busy || !file}>
        {busy ? "Hochladen…" : "Hochladen"}
      </button>
    </form>
  );
}
