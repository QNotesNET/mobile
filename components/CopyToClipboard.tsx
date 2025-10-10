"use client";

import { useState } from "react";

export default function CopyToClipboard({
  text,
  className = "rounded-lg border px-2 py-1 text-sm hover:bg-gray-50",
  copiedLabel = "Kopiert",
  copyLabel = "Kopieren",
}: {
  text: string;
  className?: string;
  copiedLabel?: string;
  copyLabel?: string;
}) {
  const [copied, setCopied] = useState(false);

  async function onCopy() {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // optional: fallback toast/alert
      alert("Kopieren nicht möglich");
    }
  }

  return (
    <button type="button" onClick={onCopy} className={className}>
      {copied ? copiedLabel : copyLabel}
    </button>
  );
}
