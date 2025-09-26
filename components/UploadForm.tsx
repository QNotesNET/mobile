"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function UploadForm({ pageId }: { pageId: string }) {
  const [busy, setBusy] = useState(false);
  const router = useRouter();

  return (
    <form
      className="grid gap-3 border rounded-xl p-4"
      encType="multipart/form-data"
      onSubmit={async (e) => {
        e.preventDefault();
        setBusy(true);
        try {
          const fd = new FormData(e.currentTarget as HTMLFormElement);
          fd.append("pageId", pageId);
          const res = await fetch("/api/upload-local", { method: "POST", body: fd });
          if (!res.ok) throw new Error("Upload failed");
          router.refresh();
        } catch {
          alert("Upload fehlgeschlagen");
        } finally {
          setBusy(false);
        }
      }}
    >
      <input type="file" name="file" accept="image/*" required />
      <button className="bg-black text-white rounded px-3 py-2 disabled:opacity-50" disabled={busy}>
        {busy ? "Hochladen…" : "Hochladen"}
      </button>
    </form>
  );
}
