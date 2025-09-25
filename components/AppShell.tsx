import { ReactNode } from "react";
import { getCurrentUser } from "@/lib/session";
import Sidebar from "@/components/Sidebar";

export default async function AppShell({ children }: { children: ReactNode }) {
  const user = await getCurrentUser();

  return (
    <div className="min-h-screen bg-white text-black">
      <Sidebar email={user?.email} />
      {/* rechter Bereich, mit Platz für die fixe Sidebar */}
      <div className="md:pl-64">
        <main className="p-6 md:p-8 max-w-5xl mx-auto">{children}</main>
      </div>
    </div>
  );
}
