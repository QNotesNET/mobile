"use client";

import React, { type ComponentType, type SVGProps, Fragment } from "react";
import {
  BoltIcon as Bolt,
  QrCodeIcon,
  UserGroupIcon,
  BookOpenIcon,
  SparklesIcon,
} from "@heroicons/react/24/outline";
import { Menu, Transition } from "@headlessui/react";

function cx(...c: Array<string | false | null | undefined>) {
  return c.filter(Boolean).join(" ");
}

type IconCmp = ComponentType<SVGProps<SVGSVGElement>>;
type AdminView = "qr" | "users" | "books" | "prompt";
type NavItem = { name: string; href: AdminView; icon: IconCmp };

const NAV: NavItem[] = [
  { name: "QR Code PB Zuweisung", href: "qr", icon: QrCodeIcon },
  { name: "Benutzer Verwaltung", href: "users", icon: UserGroupIcon },
  { name: "Powerbooks / Scans", href: "books", icon: BookOpenIcon },
  { name: "Prompt Einstellungen", href: "prompt", icon: SparklesIcon },
];

export default function AppShellClientAdmin({
  children,
  view,
  setView,
}: {
  children: React.ReactNode;
  view: AdminView;
  setView: (v: AdminView) => void;
}) {
  const nav = NAV;

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

            {/* Desktop-Navigation */}
            <nav className="ml-auto -mx-1 hidden items-center gap-1 overflow-x-auto md:flex">
              {nav.map((item) => (
                <button
                  key={item.name}
                  onClick={() => setView(item.href)}
                  className={cx(
                    "inline-flex items-center gap-2 rounded-md px-3 py-1.5 text-sm font-semibold text-gray-300",
                    "transition-colors hover:bg-white/10 hover:text-white",
                    view === item.href && "bg-white/10 text-white"
                  )}
                >
                  <item.icon className="h-5 w-5 shrink-0" aria-hidden="true" />
                  <span className="whitespace-nowrap">{item.name}</span>
                </button>
              ))}
            </nav>

            {/* Mobile Dropdown (unter dem Logo) */}
            <Menu as="div" className="relative ml-auto md:hidden">
              <Menu.Button className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-1.5 text-sm font-semibold text-white backdrop-blur hover:bg-white/20">
                {
                  (() => {
                    const current = nav.find((n) => n.href === view) ?? nav[0];
                    const Icon = current.icon;
                    return (
                      <>
                        <Icon className="h-5 w-5" />
                        {current.name}
                      </>
                    );
                  })()
                }
              </Menu.Button>
              <Transition
                as={Fragment}
                enter="transition ease-out duration-100"
                enterFrom="transform opacity-0 scale-95"
                enterTo="transform opacity-100 scale-100"
                leave="transition ease-in duration-75"
                leaveFrom="transform opacity-100 scale-100"
                leaveTo="transform opacity-0 scale-95"
              >
                <Menu.Items className="absolute right-0 z-20 mt-2 w-64 origin-top-right rounded-2xl bg-white p-2 text-sm shadow-lg ring-1 ring-black/5 focus:outline-none">
                  {nav.map((item) => (
                    <Menu.Item key={item.name}>
                      {({ active }) => (
                        <button
                          onClick={() => setView(item.href)}
                          className={cx(
                            "flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-gray-800",
                            active && "bg-gray-50",
                            view === item.href && "bg-gray-100"
                          )}
                        >
                          <item.icon className="h-5 w-5 text-gray-700" />
                          {item.name}
                        </button>
                      )}
                    </Menu.Item>
                  ))}
                </Menu.Items>
              </Transition>
            </Menu>
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
