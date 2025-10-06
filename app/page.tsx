import AppShell from "@/components/AppShell";
import { getCurrentUser } from "@/lib/session";
import DashboardClient from "./DashboardClient";

export default async function DashboardPage() {
  const user = await getCurrentUser();

  const email = user?.email ?? "—";

  // Vorname aus E-Mail ableiten (local-part, erster Abschnitt vor ., _ oder -)
  const firstName = (() => {
    if (!user?.email) return "Gast";
    const local = user.email.split("@")[0];
    const part = local.split(/[._-]/)[0] || local;
    return part.charAt(0).toUpperCase() + part.slice(1);
  })();

  return (
    <AppShell>
      <DashboardClient userName={firstName} userEmail={email} />
    </AppShell>
  );
}
