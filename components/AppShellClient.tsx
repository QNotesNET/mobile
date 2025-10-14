"use client";

import { useState, Fragment, type ComponentType, type SVGProps } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import Image from "next/image";
import { ArrowRightOnRectangleIcon, EnvelopeIcon } from "@heroicons/react/24/outline";

import { Dialog, DialogBackdrop, DialogPanel, TransitionChild } from "@headlessui/react";
import {
  Bars3Icon,
  HomeIcon,
  Cog6ToothIcon,
  XMarkIcon,
  BookOpenIcon,
} from "@heroicons/react/24/outline";

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

const NAV: NavItem[] = [
  { name: "Dashboard", href: "/", icon: HomeIcon },
  { name: "Notizbücher", href: "/notebooks", icon: BookOpenIcon },
  { name: "Einstellungen", href: "/settings", icon: Cog6ToothIcon },
  { name: "Hilfe & Kontakt", href: "mailto:info@powerbook.net", icon: EnvelopeIcon }, // neu als reguläres Nav-Item
];

export default function AppShellClient({
  email,
  displayName,
  children,
  currentPlan = "Starter", // später aus dem Backend setzen
}: {
  email: string | null;
  displayName?: string | null;
  children: React.ReactNode;
  currentPlan?: "Starter" | "Pro" | "Team" | string;
}) {
  const pathname = usePathname();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const name = displayName || prettyFromEmail(email);

  const navWithActive = NAV.map((n) => ({
    ...n,
    current:
      n.href.startsWith("mailto:")
        ? false
        : n.href === "/" ? pathname === "/" : pathname === n.href || pathname.startsWith(n.href + "/"),
  }));

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
                    width={180}
                    height={86}
                    priority
                    className="h-20 w-auto pt-3"
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

                {/* Spacer, damit der Tarif-Streifen unten sitzt */}
                <div className="flex-1" />

                {/* PLAN-STREIFEN (MOBILE) – kurz vor Nutzerbereich */}
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

                {/* User / Logout */}
                <div className="mt-3 border-t border-white/10 pt-4">
                  {email ? (
                    <div className="flex items-center justify-between gap-3">
                      <div className="min-w-0">
                        <div className="truncate text-sm font-semibold text-white">{name}</div>
                        <div className="truncate text-xs text-gray-400">{email}</div>
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
          {/* Logo */}
          <div className="flex h-12 shrink-0 items-center">
            <Link href="/" className="flex items-center">
              <Image src="/images/logos/logo-white.svg" alt="Powerbook" width={120} height={36} priority className="h-10 w-auto" />
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

            {/* Spacer, damit der Tarif-Streifen unten sitzt */}
            <div className="flex-1" />

            {/* PLAN-STREIFEN (DESKTOP) – direkt oberhalb der Trennlinie/Nutzerinfo */}
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

            {/* User / Logout */}
            <div className="mt-3 border-t border-white/10 pt-4">
              {email ? (
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <div className="truncate text-sm font-semibold text-white">{name}</div>
                    <div className="truncate text-xs text-gray-400">{email}</div>
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
      <main className="lg:pl-72">
        <div className="px-4 py-8 sm:px-6 lg:px-8">{children}</div>
      </main>
    </div>
  );
}
