/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { Separator } from "@/components/ui/separator";
import {
  AdjustmentsHorizontalIcon,
  ArrowRightOnRectangleIcon,
  Cog6ToothIcon,
  EnvelopeIcon,
} from "@heroicons/react/24/outline";
import { BoltIcon, Calendar, Check, HomeIcon } from "lucide-react";
import Link from "next/link";
import { useSearchParams, usePathname } from "next/navigation";
import React, { useEffect, useState } from "react";

function ProfileClientPage({
  name,
  role,
  currentPlan = "Starter",
}: {
  name: string;
  role: string;
  currentPlan?: "Starter" | "Pro" | "Team" | string;
}) {
  const DEFAULT_AVATAR = "/images/avatar-fallback.png";
  const [url, setUrl] = useState("");
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const linkParam = searchParams.get("link");

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/settings/profile", { method: "GET" });
        if (!res.ok) return;
        const data = await res.json();
        setUrl(data.avatarUrl || "");
      } catch {}
    })();
  }, []);

  // Alle Navigationslinks
  const linksTop = [
    { href: "/", key: "dashboard", icon: HomeIcon, label: "Dashboard" },
    { href: "/todos", key: "todos", icon: Check, label: "Aufgaben" },
    { href: "/calendar", key: "calendar", icon: Calendar, label: "Kalendar" },
  ];

  const linksMiddle = [
    {
      href: "/integrations",
      key: "integrations",
      icon: AdjustmentsHorizontalIcon,
      label: "Integrationen",
    },
    {
      href: "/settings",
      key: "settings",
      icon: Cog6ToothIcon,
      label: "Einstellungen",
    },
  ];

  const linksBottom = [
    {
      href: "/support",
      key: "support",
      icon: EnvelopeIcon,
      label: "Hilfe & Kontakt",
    },
  ];

  const isActive = (key: string, href: string) => {
    // Priorität: Query-Param > Aktuelle Route
    if (linkParam) {
      // Spezialfall: link=dashboard => /
      if (linkParam === "dashboard" && key === "dashboard") return true;
      return linkParam === key;
    }
    if (key === "dashboard") return pathname === "/";
    return pathname.startsWith(href);
  };

  const renderLink = (href: string, key: string, Icon: any, label: string) => {
    const active = isActive(key, href);
    return (
      <Link
        key={href}
        href={href}
        className={`flex flex-row items-center border-gray-100 rounded-full border px-4 py-2 transition ${
          active
            ? "bg-black text-white"
            : "text-gray-700 hover:bg-gray-100 focus:bg-gray-100"
        }`}
      >
        <Icon
          className={`size-6 shrink-0 mr-2 ${
            active ? "text-white" : "text-gray-700"
          }`}
        />
        <span
          className={`text-lg font-semibold ${
            active ? "text-white" : "text-gray-700"
          }`}
        >
          {label}
        </span>
      </Link>
    );
  };

  return (
    <div className="mt-8">
      {/* === Header === */}
      <div className="flex items-center justify-between gap-3 mb-4">
        <div className="flex min-w-0 items-center gap-3">
          <div className="size-12 overflow-hidden rounded-full ring-1 ring-white/10 bg-white/10">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={url || DEFAULT_AVATAR}
              alt="Avatar"
              className="size-full object-cover"
              onError={(e) => {
                e.currentTarget.src = DEFAULT_AVATAR;
              }}
            />
          </div>
          <div className="min-w-0 leading-tight">
            <div className="truncate text-lg font-semibold text-black m-0 p-0">
              {(name || "").split(" ")[0]}
            </div>
            <div className="truncate text-md text-gray-600 m-0 p-0">
              {(name || "").split(" ").slice(1).join(" ")}
            </div>
          </div>
        </div>
        <div>
          <form action="/api/auth/logout" method="POST">
            <button
              type="submit"
              title="Logout"
              className="inline-flex items-center rounded-md p-2 text-gray-600 hover:text-gray-400 hover:bg-white/10 focus:outline-none focus:ring-2 focus:ring-white/20"
            >
              <ArrowRightOnRectangleIcon className="size-6" />
              <span className="sr-only">Logout</span>
            </button>
          </form>
        </div>
      </div>

      <Separator />

      {/* === Top Section === */}
      <div className="flex flex-col space-y-4 my-4">
        {linksTop.map((link) =>
          renderLink(link.href, link.key, link.icon, link.label)
        )}
      </div>

      <Separator />
      <Link
        href="/pricing"
        className="my-4 rounded-xl border border-gray-200 bg-gray-100 p-3 flex flex-row items-center justify-between"
      >
        <div className="flex flex-col">
          <div className="text-lg font-semibold text-black truncate">
            <div className="text-xs uppercase tracking-wider text-gray-700">
              Dein Tarif
            </div>
            {currentPlan}
          </div>
        </div>
        <div className="mt-0.5 flex items-center justify-between">
          <p className="rounded-lg bg-white px-3 py-1.5 text-xs font-medium text-black hover:bg-white/90">
            Verwalten
          </p>
        </div>
      </Link>
      <Separator />

      {/* === Middle Section === */}
      <div className="flex flex-col space-y-4 my-4">
        {linksMiddle.map((link) =>
          renderLink(link.href, link.key, link.icon, link.label)
        )}
      </div>

      <Separator />

      {/* === Bottom Section === */}
      <div className="flex flex-col space-y-4 my-4">
        {linksBottom.map((link) =>
          renderLink(link.href, link.key, link.icon, link.label)
        )}

        {role === "admin" && (
          <Link
            href={"/admin"}
            className="flex flex-row items-center border border-gray-100 bg-black text-white rounded-full px-4 py-2"
          >
            <BoltIcon className="size-6 shrink-0 mr-2 text-white" />
            <span className="text-lg font-semibold text-white">
              Admin - Center
            </span>
          </Link>
        )}
      </div>

      {/* === Plan Section === */}

      <Separator />

      <p className="mt-4 text-xs text-gray-500 w-full text-center mb-16">
        App-Version: 1.0.0
      </p>
    </div>
  );
}

export default ProfileClientPage;
