import { ReactNode } from "react";
import { connectToDB } from "@/lib/mongoose";
import { getCurrentUser } from "@/lib/session";
import User from "@/models/User";
import AppShellClient from "@/components/AppShellClient";

export default async function AppShell({ children }: { children: ReactNode }) {
  await connectToDB();

  const session = await getCurrentUser(); // { id, email, ... }
  const email: string | null = session?.email ?? null;
  let displayName: string | null = null;

  if (session?.id) {
    const u = await User.findById(session.id)
      .select({ firstName: 1, lastName: 1 })
      .lean<{ firstName?: string; lastName?: string } | null>();
    if (u) {
      const full = [u.firstName, u.lastName].filter(Boolean).join(" ").trim();
      displayName = full || null;
    }
  }

  return (
    <AppShellClient email={email} displayName={displayName} role={session?.role ?? ""}>
      {children}
    </AppShellClient>
  );
}
