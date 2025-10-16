"use client";

import React, { Fragment, type ComponentType, type SVGProps } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BoltIcon as Bolt,
  QrCodeIcon,
  UserGroupIcon,
  BookOpenIcon,
  SparklesIcon,
} from "@heroicons/react/24/outline";
import { Listbox, Transition } from "@headlessui/react";
import { CheckIcon, ChevronUpDownIcon } from "@heroicons/react/20/solid";

function cx(...c: Array<string | false | null | undefined>) {
  return c.filter(Boolean).join(" ");
}

type IconCmp = ComponentType<SVGProps<SVGSVGElement>>;
type NavItem = { name: string; href: string; icon: IconCmp; current?: boolean };

// Routen relativ zu /admin
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
  view: any;
  setView: any;
}) {
  const nav = NAV.map((n) => ({ ...n }));
  const selected = nav.find((n) => n.href === view) ?? nav[0];

  return (
    <div className="min-h-dvh bg-white">
      {/* Schwarze Sub-Topbar, bündig mit linker Sidebar (lg:pl-72) */}
      <div className="sticky top-0 z-30 w-full border-b border-white/10 bg-black text-white lg:pl-72">
        <div className="px-4 sm:px-6 lg:px-8">
          {/* auf Mobile/Tablet vertikal gestapelt; auf Desktop horizontal */}
          <div className="flex flex-col gap-2 py-3 md:flex-row md:items-center md:gap-3">
            {/* Titel links mit Bolt-Icon */}
            <div className="flex items-center gap-2 shrink-0">
              <Bolt className="h-5 w-5 text-gray-300" aria-hidden="true" />
              <span className="text-sm font-semibold tracking-wide">
                Power Admin
              </span>
            </div>

            {/* feiner Divider (nur >= sm) */}
            <div className="mx-2 hidden h-5 w-px bg-white/10 sm:block" />

            {/* Desktop-Navigation (unverändert) */}
            <nav className="ml-auto -mx-1 hidden items-center gap-1 overflow-x-auto md:flex">
              {nav.map((item) => {
                return (
                  <p
                    key={item.name}
                    onClick={() => setView(item.href)}
                    className={cx(
                      "inline-flex items-center gap-2 rounded-md px-3 py-1.5 text-sm font-semibold cursor-pointer text-gray-300",
                      "transition-colors hover:bg-white/10 hover:text-white"
                    )}
                  >
                    <item.icon className="h-5 w-5 shrink-0" aria-hidden="true" />
                    <span className="whitespace-nowrap">{item.name}</span>
                  </p>
                );
              })}
            </nav>

            {/* Mobile/Tablet: Dropdown direkt UNTER dem Titel */}
            <div className="md:hidden">
              <Listbox value={selected} onChange={(item: NavItem) => setView(item.href)}>
                <div className="relative mt-1 w-[280px]">
                  {/* Button */}
                  <Listbox.Button
                    className="relative w-full rounded-xl bg-white px-3 py-2 pr-9 text-left text-sm text-gray-900 shadow-sm ring-1 ring-inset ring-gray-200 focus:outline-none focus:ring-2 focus:ring-black/20"
                    aria-label="Admin Navigation"
                  >
                    <span className="flex items-center gap-2">
                      <selected.icon className="h-5 w-5 text-gray-500" />
                      <span className="block truncate">{selected.name}</span>
                    </span>
                    <span className="pointer-events-none absolute inset-y-0 right-2 flex items-center">
                      <ChevronUpDownIcon className="h-5 w-5 text-gray-400" aria-hidden="true" />
                    </span>
                  </Listbox.Button>

                  {/* Options */}
                  <Transition
                    as={Fragment}
                    leave="transition ease-in duration-100"
                    leaveFrom="opacity-100"
                    leaveTo="opacity-0"
                  >
                    <Listbox.Options className="absolute z-50 mt-2 max-h-60 w-full overflow-auto rounded-xl bg-white py-1 text-sm shadow-lg ring-1 ring-black/5 focus:outline-none">
                      {nav.map((item) => (
                        <Listbox.Option
                          key={item.href}
                          value={item}
                          className={({ active }) =>
                            cx(
                              "relative cursor-pointer select-none px-3 py-2",
                              active ? "bg-gray-50" : "bg-white"
                            )
                          }
                        >
                          {({ selected: isSelected }) => (
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2 text-gray-900">
                                <item.icon className="h-5 w-5 text-gray-500" />
                                <span className="block truncate">{item.name}</span>
                              </div>
                              {isSelected ? (
                                <CheckIcon className="h-5 w-5 text-gray-500" aria-hidden="true" />
                              ) : null}
                            </div>
                          )}
                        </Listbox.Option>
                      ))}
                    </Listbox.Options>
                  </Transition>
                </div>
              </Listbox>
            </div>
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
