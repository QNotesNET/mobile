"use client";

import { Separator } from "@/components/ui/separator";
import {
  AdjustmentsHorizontalIcon,
  ArrowRightOnRectangleIcon,
  Cog6ToothIcon,
  EnvelopeIcon,
} from "@heroicons/react/24/outline";
import { Bolt, BoltIcon, BookOpenIcon, Calendar, Check } from "lucide-react";
import Link from "next/link";
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

  return (
    <div className="mt-8">
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
      <div className="flex flex-col space-y-4 my-4">
        <Link
          href={"/todos"}
          className="flex flex-row items-center border-gray-100 rounded-full border px-4 py-2 hover:bg-gray-100 focus:bg-gray-100"
        >
          <Check className="size-6 shrink-0 mr-2 text-gray-700" />
          <span className="text-lg font-semibold text-gray-700">Aufgaben</span>
        </Link>
        <Link
          href={"/calendar"}
          className="flex flex-row items-center border-gray-100 rounded-full border px-4 py-2 hover:bg-gray-100 focus:bg-gray-100"
        >
          <Calendar className="size-6 shrink-0 mr-2 text-gray-700" />
          <span className="text-lg font-semibold text-gray-700">Kalendar</span>
        </Link>
      </div>
      <Separator />
      <div className="flex flex-col space-y-4 my-4">
        {/* <Link
          href={"/notebooks"}
          className="flex flex-row items-center border-gray-100 rounded-full border px-4 py-2 hover:bg-gray-100 focus:bg-gray-100"
        >
          <BookOpenIcon className="size-6 shrink-0 mr-2 text-gray-700" />
          <span className="text-lg font-semibold text-gray-700">
            Powerbooks
          </span>
        </Link> */}
        <Link
          href={"/integrations"}
          className="flex flex-row items-center border-gray-100 rounded-full border px-4 py-2 hover:bg-gray-100 focus:bg-gray-100"
        >
          <AdjustmentsHorizontalIcon className="size-6 shrink-0 mr-2 text-gray-700" />
          <span className="text-lg font-semibold text-gray-700">
            Integrationen
          </span>
        </Link>
        <Link
          href={"/settings"}
          className="flex flex-row items-center border-gray-100 rounded-full border px-4 py-2 hover:bg-gray-100 focus:bg-gray-100"
        >
          <Cog6ToothIcon className="size-6 shrink-0 mr-2 text-gray-700" />
          <span className="text-lg font-semibold text-gray-700">
            Einstellungen
          </span>
        </Link>
      </div>
      <Separator />
      <div className="flex flex-col space-y-4 my-4">
        <Link
          href={"/support"}
          className="flex flex-row items-center border-gray-100 rounded-full border px-4 py-2 hover:bg-gray-100 focus:bg-gray-100"
        >
          <EnvelopeIcon className="size-6 shrink-0 mr-2 text-gray-700" />
          <span className="text-lg font-semibold text-gray-700">
            Hilfe & Kontakt
          </span>
        </Link>
        {role === "admin" && (
          <Link
            href={"/admin"}
            className="flex flex-row items-center border-gray-100 bg-black text-white rounded-full border px-4 py-2"
          >
            <BoltIcon className="size-6 shrink-0 mr-2 text-white" />
            <span className="text-lg font-semibold text-white">
              Admin - Center
            </span>
          </Link>
        )}
      </div>
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
      <p className="mt-4 text-xs text-gray-500 w-full text-center">App-Version: 1.0.0</p>
    </div>
  );
}

export default ProfileClientPage;
