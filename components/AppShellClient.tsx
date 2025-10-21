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
import { BookOpen, Settings, Scan, Camera } from "lucide-react"; // 🔹 NEU

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
  avatarUrl, // initial (vom Server/Layout)
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

  // falls Prop später neu reinkommt (SSR/Navigation), übernehmen
  useEffect(() => {
    setAvatar(avatarUrl || DEFAULT_AVATAR);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [avatarUrl]);

  // Erst-Laden + Listener für Sofort-Update
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

    // Beim Mount einmal holen
    refresh();

    // Sofort-Update: reagiert auf Event aus den Settings
    const onAvatarUpdated = (e: Event) => {
      const url = (e as CustomEvent<string>).detail;
      if (typeof url === "string" && url.length) setAvatar(url);
    };
    window.addEventListener("pb:avatar-updated", onAvatarUpdated as EventListener);

    // Mehrere Tabs synchron halten (optional, safe to keep)
    let bc: BroadcastChannel | null = null;
    try {
      bc = new BroadcastChannel("pb");
      bc.onmessage = (msg) => {
        if (msg?.data?.type === "avatar-updated" && typeof msg.data.url === "string") {
          setAvatar(msg.data.url);
        }
      };
    } catch {
      // BroadcastChannel nicht verfügbar (Safari <16.4 oder SSR) – ignorieren
    }

    // Beim Tab-Fokus aktualisieren
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

  return (
    <div className="min-h-dvh bg-white">
      {/* Mobile Drawer */}
      <Dialog open={sidebarOpen} onClose={setSidebarOpen} className="relative z-50 lg:hidden">
        <DialogBackdrop transition className="fixed inset-0 bg-black transition-opacity data-[closed]:opacity-0" />
        <div className="fixed inset-0 flex">
          <DialogPanel
            transition
            className="relative mr-16 flex w-full max-w-xs flex-1 transform bg-black ring-1 ring-white/10 transition data-[closed]:-translate-x-full"
          >
            <TransitionChild as={Fragment}>
              <div className="absolute left-full top-0 flex w-16 justify-center pt-5 data-[closed]:opacity-0">
                <button type="button" onClick={() => setSidebarOpen(false)} className="-m-2.5 p-2.5 text-white">
                  <span className="sr-only">Close sidebar</span>
                  <XMarkIcon className="size-6" />
                </button>
              </div>
            </TransitionChild>

            {/* Drawer content */}
            <div className="flex grow flex-col gap-y-5 overflow-y-auto px-6 pb-4">
              <div className="flex h-20 shrink-0 items-center">
                <Link href="/" onClick={() => setSidebarOpen(false)} className="flex items-center">
                  <Image
                    src="/images/logos/logo-white.svg"
                    alt="Powerbook"
                    width={120}
                    height={36}
                    priority
                    className="h-15 w-auto pt-3"
                  />
                </Link>
              </div>

              <nav className="flex flex-1 flex-col">
                {/* Hauptnav */}
                <ul className="-mx-2 space-y-1">
                  {navWithActive.map((item) => (
                    <li key={item.name}>
                      {item.href.startsWith("mailto:") ? (
                        <a
                          href={item.href}
                          onClick={() => setSidebarOpen(false)}
                          className="group flex gap-x-3 rounded-md p-2 text-sm font-semibold text-gray-300 hover:bg-white/10 hover:text-white"
                        >
                          <item.icon className="size-6 shrink-0" />
                          {item.name}
                        </a>
                      ) : (
                        <Link
                          href={item.href}
                          onClick={() => setSidebarOpen(false)}
                          aria-current={item.current ? "page" : undefined}
                          className={classNames(
                            item.current ? "bg-white/10 text-white" : "text-gray-300 hover:bg-white/10 hover:text-white",
                            "group flex gap-x-3 rounded-md p-2 text-sm font-semibold"
                          )}
                        >
                          <item.icon className="size-6 shrink-0" />
                          {item.name}
                        </Link>
                      )}
                    </li>
                  ))}
                </ul>

                <div className="flex-1" />

                {/* PLAN-STREIFEN (MOBILE) */}
                <div className="mt-4">
                  <div className="rounded-xl border border-white/10 bg-white/5 p-3">
                    <div className="text-[10px] uppercase tracking-wider text-gray-300">Dein Tarif</div>
                    <div className="mt-0.5 flex items-center justify-between">
                      <div className="text-sm font-semibold text-white truncate">{currentPlan}</div>
                      <Link
                        href="/pricing"
                        onClick={() => setSidebarOpen(false)}
                        className="rounded-lg bg-white px-3 py-1.5 text-xs font-medium text-black hover:bg-white/90"
                      >
                        Verwalten
                      </Link>
                    </div>
                  </div>
                </div>

                {/* User / Logout (MOBILE) */}
                <div className="mt-3 border-t border-white/10 pt-4">
                  {email ? (
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex min-w-0 items-center gap-3">
                        <div className="size-9 overflow-hidden rounded-full ring-1 ring-white/10 bg-white/10">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={avatar || DEFAULT_AVATAR}
                            alt="Avatar"
                            className="size-full object-cover"
                            onError={(e) => { (e.currentTarget.src = DEFAULT_AVATAR); }}
                          />
                        </div>
                        <div className="min-w-0">
                          <div className="truncate text-sm font-semibold text-white">
                            {(name || "").split(" ")[0]}
                          </div>
                          <div className="truncate text-xs text-gray-400">
                            {(name || "").split(" ").slice(1).join(" ")}
                          </div>
                        </div>
                      </div>

                      <form action="/api/auth/logout" method="POST">
                        <button
                          type="submit"
                          title="Logout"
                          className="inline-flex items-center rounded-md p-2 text-gray-300 hover:text-white hover:bg-white/10 focus:outline-none focus:ring-2 focus:ring-white/20"
                        >
                          <ArrowRightOnRectangleIcon className="size-6" />
                          <span className="sr-only">Logout</span>
                        </button>
                      </form>
                    </div>
                  ) : (
                    <div className="text-sm text-gray-400">Nicht eingeloggt</div>
                  )}
                </div>
              </nav>
            </div>
          </DialogPanel>
        </div>
      </Dialog>

      {/* Static sidebar (desktop) */}
      <div className="hidden lg:fixed lg:inset-y-0 lg:z-40 lg:flex lg:w-72 lg:flex-col lg:bg-black lg:ring-1 lg:ring-white/10">
        <div className="flex grow flex-col gap-y-6 overflow-y-auto px-6 py-6">
          <div className="flex h-12 shrink-0 items-center">
            <Link href="/" className="flex items-center">
              <Image src="/images/logos/logo-white.svg" alt="Powerbook" width={120} height={36} priority className="h-15 w-auto" />
            </Link>
          </div>

          {/* Hauptnav */}
          <nav className="flex flex-1 flex-col">
            <ul className="-mx-2 space-y-1">
              {navWithActive.map((item) => (
                <li key={item.name}>
                  {item.href.startsWith("mailto:") ? (
                    <a
                      href={item.href}
                      className="group flex gap-x-3 rounded-md p-2 text-sm font-semibold text-gray-300 hover:bg-white/10 hover:text-white"
                    >
                      <item.icon className="size-6 shrink-0" />
                      {item.name}
                    </a>
                  ) : (
                    <Link
                      href={item.href}
                      aria-current={item.current ? "page" : undefined}
                      className={classNames(
                        item.current ? "bg-white/10 text-white" : "text-gray-300 hover:bg-white/10 hover:text-white",
                        "group flex gap-x-3 rounded-md p-2 text-sm font-semibold"
                      )}
                    >
                      <item.icon className="size-6 shrink-0" />
                      {item.name}
                    </Link>
                  )}
                </li>
              ))}
            </ul>

            <div className="flex-1" />

            {/* PLAN-STREIFEN (DESKTOP) */}
            <div className="mt-3 rounded-xl border border-white/10 bg-white/5 p-3">
              <div className="text-[10px] uppercase tracking-wider text-gray-300">Dein Tarif</div>
              <div className="mt-0.5 flex items-center justify-between">
                <div className="text-sm font-semibold text-white truncate">{currentPlan}</div>
                <Link
                  href="/pricing"
                  className="rounded-lg bg-white px-3 py-1.5 text-xs font-medium text-black hover:bg-white/90"
                >
                  Verwalten
                </Link>
              </div>
            </div>

            {/* User / Logout (DESKTOP) */}
            <div className="mt-3 border-t border-white/10 pt-4">
              {email ? (
                <div className="flex items-center justify-between gap-3">
                  <div className="flex min-w-0 items-center gap-3">
                    <div className="size-9 overflow-hidden rounded-full ring-1 ring-white/10 bg-white/10">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={avatar || DEFAULT_AVATAR}
                        alt="Avatar"
                        className="size-full object-cover"
                        onError={(e) => { (e.currentTarget.src = DEFAULT_AVATAR); }}
                      />
                    </div>
                    <div className="min-w-0">
                      <div className="truncate text-sm font-semibold text-white">
                        {(name || "").split(" ")[0]}
                      </div>
                      <div className="truncate text-xs text-gray-400">
                        {(name || "").split(" ").slice(1).join(" ")}
                      </div>
                    </div>
                  </div>

                  <form action="/api/auth/logout" method="POST">
                    <button
                      type="submit"
                      title="Logout"
                      className="inline-flex items-center rounded-md p-2 text-gray-300 hover:text-white hover:bg-white/10 focus:outline-none focus:ring-2 focus:ring-white/20"
                    >
                      <ArrowRightOnRectangleIcon className="size-6" />
                      <span className="sr-only">Logout</span>
                    </button>
                  </form>
                </div>
              ) : (
                <div className="text-sm text-gray-400">Nicht eingeloggt</div>
              )}
            </div>
          </nav>
        </div>
      </div>

      {/* Mobile Topbar */}
      <div className="sticky top-0 z-30 flex items-center gap-x-4 bg-black px-4 py-3 text-white shadow-sm lg:hidden">
        <button type="button" onClick={() => setSidebarOpen(true)} className="-m-2.5 p-2.5 text-gray-200 hover:text-white">
          <span className="sr-only">Open sidebar</span>
          <Bars3Icon className="size-6" />
        </button>
        <div className="flex-1 text-sm font-semibold">Powerbook</div>
      </div>

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
          <Link
            href="/scan"
            className="pointer-events-auto absolute left-1/2 -translate-x-1/2 -top-6 inline-flex items-center justify-center size-16 rounded-full bg-green-600 ring-4 ring-white shadow-3xl active:scale-95 transition"
            aria-label="Seite scannen"
          >
            <Camera className="size-7 text-white" />
          </Link>
        </div>
      </nav>
    </div>
  );
}
