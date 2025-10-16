// app/(dashboard)/layout.tsx
import AppShell from "@/components/AppShell";
import { usePathname } from "next/navigation";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // AppShell enthält Sidebar + Topbar + Content-Wrapper
  return <AppShell>{children}</AppShell>;
}
