// app/notebooks/page.tsx
import AppShell from "@/components/AppShell";
import { headers as nextHeaders, cookies as nextCookies } from "next/headers";
import NotebookList from "@/components/NotebookList";

type NotebookItem = { _id?: string; id?: string; title: string };

// Base-URL aus Request-Headern ermitteln (Server)
async function getBaseUrl() {
  const h = await nextHeaders();
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "localhost:3000";
  const proto = h.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");
  return `${proto}://${host}`;
}

async function loadNotebooks(): Promise<NotebookItem[]> {
  const base = await getBaseUrl();
  const cookieHeader = (await nextCookies()).toString(); // Session-Cookie weiterreichen

  const res = await fetch(`${base}/api/notebooks`, {
    cache: "no-store",
    headers: { cookie: cookieHeader },
  }).catch(() => null);

  if (!res || !res.ok) return [];
  const data = await res.json().catch(() => ({}));
  return (data?.items ?? []) as NotebookItem[];
}

export default async function NotebooksPage() {
  const items = await loadNotebooks();

  return (
    <AppShell>
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Notebooks</h1>
      </div>

      <div className="mt-6">
        <NotebookList items={items} />
      </div>
    </AppShell>
  );
}
