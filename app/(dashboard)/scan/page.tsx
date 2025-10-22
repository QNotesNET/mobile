// app/notebooks/page.tsx
import { headers as nextHeaders, cookies as nextCookies } from "next/headers";
import ClientScan from "./ClientScan";
import { redirect } from "next/navigation";

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

  if (items.length === 1) {
    const id = items[0]._id || items[0].id;
    if (id) {
      redirect(`/scan/${id}?notebookId=${id}`);
    }
  }

  return (
    <>
      <div className="flex flex-col items-start justify-between">
        <h1 className="text-2xl font-semibold">Powerbooks</h1>
        <p className="text-gray-500 text-sm mt-2">Wähle dein Powerbook aus um mit dem Scannen zu beginnen.</p>
      </div>
      <div className="mt-6">
        <ClientScan items={items} />
      </div>
    </>
  );
}
