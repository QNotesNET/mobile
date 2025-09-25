"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export default function LogoutButton() {
  const r = useRouter();
  const [loading, setLoading] = useState(false);

  async function onLogout() {
    setLoading(true);
    await fetch("/api/auth/logout", { method: "POST" });
    r.replace("/login"); // zurück zum Login
  }

  return (
    <button
      onClick={onLogout}
      disabled={loading}
      className="inline-flex items-center justify-center rounded-lg bg-black px-4 py-2 text-white hover:bg-black/90 disabled:opacity-50"
    >
      {loading ? "Abmelden..." : "Logout"}
    </button>
  );
}
