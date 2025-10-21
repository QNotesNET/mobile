"use client";

import { useState, useEffect, Fragment, type ComponentType, type SVGProps } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import Image from "next/image";
import { ArrowRightOnRectangleIcon, CalendarIcon, CheckIcon, EnvelopeIcon } from "@heroicons/react/24/outline";

import { Dialog, DialogBackdrop, DialogPanel, TransitionChild } from "@headlessui/react";
import {
  Bars3Icon,
  HomeIcon,
  Cog6ToothIcon,
  XMarkIcon,
  BookOpenIcon,
  AdjustmentsHorizontalIcon,
  BoltIcon as Bolt,
} from "@heroicons/react/24/outline";
import { BookOpen, Settings, Camera } from "lucide-react"; // Scan Icon behalten

function classNames(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

function prettyFromEmail(email?: string | null) {
  if (!email) return "";
  const local = email.split("@")[0];
  return local
    .split(/[._-]+/)
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

type IconCmp = ComponentType<SVGProps<SVGSVGElement>>;
type NavItem = { name: string; href: string; icon: IconCmp; current?: boolean };

export default function AppShellClient({
  email,
  displayName,
  children,
  currentPlan = "Starter",
  role,
  avatarUrl,
}: {
  email: string | null;
  displayName?: string | null;
  children: React.ReactNode;
  currentPlan?: "Starter" | "Pro" | "Team" | string;
  role: string;
  avatarUrl?: string | null;
}) {
  const DEFAULT_AVATAR = "/images/avatar-fallback.png";
  const pathname = usePathname();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const name = displayName || prettyFromEmail(email);

  // —— Avatar live halten
  const [avatar, setAvatar] = useState<string>(avatarUrl || DEFAULT_AVATAR);
  useEffect(() => {
    setAvatar(avatarUrl || DEFAULT_AVATAR);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [avatarUrl]);

  useEffect(() => {
    const ctrl = new AbortController();

    async function refresh() {
      try {
        const res = await fetch("/api/settings/profile", { method: "GET", signal: ctrl.signal });
        if (!res.ok) return;
        const data = await res.json();
        const url = (data?.avatarUrl as string | undefined) || DEFAULT_AVATAR;
        setAvatar(url);
      } catch {
        /* ignore */
      }
    }

    refresh();

    const onAvatarUpdated = (e: Event) => {
      const url = (e as CustomEvent<string>).detail;
      if (typeof url === "string" && url.length) setAvatar(url);
    };
    window.addEventListener("pb:avatar-updated", onAvatarUpdated as EventListener);

    let bc: BroadcastChannel | null = null;
    try {
      bc = new BroadcastChannel("pb");
      bc.onmessage = (msg) => {
        if (msg?.data?.type === "avatar-updated" && typeof msg.data.url === "string") {
          setAvatar(msg.data.url);
        }
      };
    } catch {}

    const onVis = () => {
      if (document.visibilityState === "visible") refresh();
    };
    document.addEventListener("visibilitychange", onVis);

    return () => {
      ctrl.abort();
      window.removeEventListener("pb:avatar-updated", onAvatarUpdated as EventListener);
      document.removeEventListener("visibilitychange", onVis);
      try { bc?.close(); } catch {}
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  let NAV: NavItem[];
  if (role === "admin") {
    NAV = [
      { name: "Dashboard", href: "/", icon: HomeIcon },
      { name: "Powerbooks", href: "/notebooks", icon: BookOpenIcon },
      { name: "Aufgaben", href: "/todos", icon: CheckIcon },
      { name: "Kalendar", href: "/calendar", icon: CalendarIcon },
      { name: "Integrationen", href: "/integrations", icon: AdjustmentsHorizontalIcon },
      { name: "Einstellungen", href: "/settings", icon: Cog6ToothIcon },
      { name: "Hilfe & Kontakt", href: "mailto:info@powerbook.net", icon: EnvelopeIcon },
      { name: "Admin", href: "/admin", icon: Bolt },
    ];
  } else {
    NAV = [
      { name: "Dashboard", href: "/", icon: HomeIcon },
      { name: "Powerbooks", href: "/notebooks", icon: BookOpenIcon },
      { name: "Aufgaben", href: "/todos", icon: CheckIcon },
      { name: "Kalendar", href: "/calendar", icon: CalendarIcon },
      { name: "Integrationen", href: "/integrations", icon: AdjustmentsHorizontalIcon },
      { name: "Einstellungen", href: "/settings", icon: Cog6ToothIcon },
      { name: "Hilfe & Kontakt", href: "mailto:info@powerbook.net", icon: EnvelopeIcon },
    ];
  }

  const navWithActive = NAV.map((n) => ({
    ...n,
    current: n.href.startsWith("mailto:")
      ? false
      : n.href === "/"
      ? pathname === "/"
      : pathname === n.href || pathname.startsWith(n.href + "/"),
  }));

  const isAdmin = pathname.includes("/admin");
  const onScanPage = pathname.startsWith("/scan"); // <<<< wichtig

  // Event dispatch helper für den Kamera-Auslöser
  function fireScanShutter() {
    const ev = new Event("pb:scan-shutter");
    window.dispatchEvent(ev);
  }

  return (
    <div className="min-h-dvh bg-white">
      {/* ... alles oben/unverändert ... */}

      {/* Main */}
      {isAdmin ? (
        <main className="">
          <div className="">{children}</div>
        </main>
      ) : (
        <main className="lg:pl-72">
          <div className="px-4 py-8 sm:px-6 lg:px-8">{children}</div>
        </main>
      )}

      {/* 🔻 Mobile Bottom Navigation (nur Mobile) */}
      <nav className="lg:hidden fixed inset-x-0 bottom-0 z-40 flex justify-center pointer-events-none">
        <div className="relative w-full">
          {/* Leiste */}
          <div className="pointer-events-auto h-20 bg-black border-t shadow-lg ring-1 ring-white/10 flex items-center justify-between px-16 text-gray-200">
            <Link href="/notebooks" className="inline-flex items-center justify-center size-10 rounded-full hover:bg-white/10 active:scale-95 transition">
              <BookOpen className="size-6" />
              <span className="sr-only">Powerbooks</span>
            </Link>
            <Link href="/settings" className="inline-flex items-center justify-center size-10 rounded-full hover:bg-white/10 active:scale-95 transition">
              <Settings className="size-6" />
              <span className="sr-only">Einstellungen</span>
            </Link>
          </div>

          {/* Center FAB */}
          {onScanPage ? (
            <button
              type="button"
              onClick={fireScanShutter}
              className="pointer-events-auto absolute left-1/2 -translate-x-1/2 -top-6 inline-flex items-center justify-center size-16 rounded-full bg-green-600 ring-4 ring-white shadow-3xl active:scale-95 transition"
              aria-label="Foto auslösen"
            >
              <Camera className="size-7 text-white" />
            </button>
          ) : (
            <Link
              href="/scan"
              className="pointer-events-auto absolute left-1/2 -translate-x-1/2 -top-6 inline-flex items-center justify-center size-16 rounded-full bg-green-600 ring-4 ring-white shadow-3xl active:scale-95 transition"
              aria-label="Seite scannen"
            >
              <Camera className="size-7 text-white" />
            </Link>
          )}
        </div>
      </nav>
    </div>
  );
}
