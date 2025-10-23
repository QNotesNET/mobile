import AppShell from "@/components/AppShell";
import Loader from "@/components/Loader";
import { Loader2 } from "lucide-react";
export default function Loading() {
  return (
    <AppShell>
      <div className="max-w-screen overflow-x-hidden h-[80vh] flex flex-col items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-gray-600" />
        <p className="text-sm text-gray-500 mt-4">Powerbook lädt...</p>
      </div>
    </AppShell>
  );
}
