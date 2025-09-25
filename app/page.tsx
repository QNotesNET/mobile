import AppShell from "@/components/AppShell";
import { getCurrentUser } from "@/lib/session";

export default async function DashboardPage() {
  const user = await getCurrentUser();

  return (
    <AppShell>
      <h1 className="text-3xl font-semibold">Dashboard</h1>

      <div className="mt-6 rounded-2xl border bg-white p-6 shadow-sm">
        <p className="text-gray-700">
          {user ? (
            <>Eingeloggt als <span className="font-medium">{user.email}</span>.</>
          ) : (
            <>Kein User geladen (nicht eingeloggt?)</>
          )}
        </p>
        <p className="mt-2 text-sm text-gray-500">
          Das ist deine Startseite. Hier kommt später das Notizbuch-Overview etc.
        </p>
      </div>
    </AppShell>
  );
}
