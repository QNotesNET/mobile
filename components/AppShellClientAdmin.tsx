"use client";

import { type ComponentType, type SVGProps } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BoltIcon as Bolt,
  QrCodeIcon,
  UserGroupIcon,
  BookOpenIcon,
  SparklesIcon, // 👈 neu: Robot für Prompt-Einstellungen
} from "@heroicons/react/24/outline";

function cx(...c: Array<string | false | null | undefined>) {
  return c.filter(Boolean).join(" ");
}

type IconCmp = ComponentType<SVGProps<SVGSVGElement>>;
type NavItem = { name: string; href: string; icon: IconCmp; current?: boolean };

// Routen relativ zu /admin
const NAV: NavItem[] = [
  { name: "QR Code PB Zuweisung", href: "/admin", icon: QrCodeIcon },
  { name: "Benutzer Verwaltung", href: "/admin/users", icon: UserGroupIcon },
  { name: "Powerbooks / Scans", href: "/admin/powerbooks", icon: BookOpenIcon },
  { name: "Prompt Einstellungen", href: "/admin/prompts", icon: SparklesIcon }, // 👈 Robot
];

export default function AppShellClientAdmin({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();

  const nav = NAV.map((n) => ({
    ...n,
    current:
      pathname === n.href ||
      (n.href !== "/admin" && pathname.startsWith(n.href + "/")),
  }));

  return (
    <div className="min-h-dvh bg-white">
      {/* Schwarze Sub-Topbar, bündig mit linker Sidebar (lg:pl-72) */}
      <div className="sticky top-0 z-30 w-full border-b border-white/10 bg-black text-white lg:pl-72">
        <div className="px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-3 py-3">
            {/* Titel links mit Bolt-Icon */}
            <div className="flex items-center gap-2 shrink-0">
              <Bolt className="h-5 w-5 text-gray-300" aria-hidden="true" />
              <span className="text-sm font-semibold tracking-wide">
                Power Admin
              </span>
            </div>

            {/* feiner Divider */}
            <div className="mx-2 hidden h-5 w-px bg-white/10 sm:block" />

            {/* Navigation rechts – identische States wie in der Hauptnav */}
            <nav className="ml-auto -mx-1 flex items-center gap-1 overflow-x-auto">
              {nav.map((item) => {
                const active = item.current;
                return (
                  <Link
                    key={item.name}
                    href={item.href}
                    aria-current={active ? "page" : undefined}
                    className={cx(
                      "inline-flex items-center gap-2 rounded-md px-3 py-1.5 text-sm font-semibold", // 👈 bold text
                      "transition-colors",
                      active
                        ? "bg-white/10 text-white"
                        : "text-gray-300 hover:bg-white/10 hover:text-white"
                    )}
                  >
                    <item.icon
                      className={cx(
                        "h-5 w-5 shrink-0",
                        active ? "text-white" : "text-gray-300"
                      )}
                      aria-hidden="true"
                    />
                    <span className="whitespace-nowrap">{item.name}</span>
                  </Link>
                );
              })}
            </nav>
          </div>
        </div>
      </div>

      {/* Inhalt */}
      <main className="lg:pl-72">
        <div className="px-4 py-8 sm:px-6 lg:px-8">{children}</div>
      </main>
    </div>
  );
}
