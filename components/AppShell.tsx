import { ReactNode } from "react";
import { getCurrentUser } from "@/lib/session";
import AppShellClient from "./AppShellClient";

export default async function AppShell({ children }: { children: ReactNode }) {
  const user = await getCurrentUser(); // lädt E-Mail aus Session/JWT
  return <AppShellClient email={user?.email ?? null}>{children}</AppShellClient>;
}
