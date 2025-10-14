"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import LogoutButton from "@/components/LogoutButton";
import Image from "next/image";

function NavItem({ href, label }: { href: string; label: string }) {
  const pathname = usePathname();
  const active = pathname === href || pathname.startsWith(href + "/");
  return (
    <Link
      href={href}
      className={`flex items-center gap-2 rounded-xl px-3 py-2 text-sm transition
      ${active ? "bg-black text-white" : "text-gray-700 hover:bg-gray-100"}`}
    >
      {label}
    </Link>
  );
}

export default function Sidebar({ email }: { email?: string | null }) {
  return (
    <aside
      className="fixed left-0 top-0 z-40 h-screen w-64 border-r bg-white px-4"
      aria-label="Sidebar"
    >
      {/* Logo */}
      <div className="flex items-center gap-3 h-16 border-b">
        <Image
          src="/images/logos/logo-black.svg"
          alt="Powerbook"
          width={140}
          height={45}
          priority

        />
      </div>

      {/* Navigation */}
      <nav className="mt-4 space-y-1">
        <NavItem href="/" label="Dashboard" />
        <NavItem href="/notebooks" label="Notebooks" />
        <NavItem href="/settings" label="Settings" />
      </nav>

      {/* User */}
      <div className="absolute inset-x-4 bottom-4">
        <div className="rounded-xl border bg-white px-3 py-2">
          <div className="truncate text-sm text-gray-600">{email ?? "—"}</div>
          <div className="mt-2">
            <LogoutButton />
          </div>
        </div>
      </div>
    </aside>
  );
}
