/* eslint-disable @typescript-eslint/no-explicit-any */
// app/(dashboard)/qr/page.tsx
"use client";

import { useEffect, useMemo, useState, Fragment } from "react";
import QRCode from "qrcode";
import AppShellClientAdmin from "@/components/AppShellClientAdmin";
import { Dialog, Transition, Listbox, Menu } from "@headlessui/react";
import {
  ChevronUpDownIcon,
  CheckIcon,
  EllipsisHorizontalIcon,
  PencilSquareIcon,
  TrashIcon,
  EnvelopeOpenIcon,
  PencilIcon,
  InformationCircleIcon,
} from "@heroicons/react/24/outline";
import { Button } from "@/components/ui/button";
import {
  Select as DropDown,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

type SettingsState = {
  vision: { model: string; resolution: string; prompt: string };
  pageDetect: { model: string; resolution: string; prompt: string };
  updatedAt?: string | null;
};

const SETTINGS_API = "/api/settings";

const MODEL_OPTIONS = [
  "gpt-4o-mini",
  "gpt-4o",
  "gpt-4.1-mini",
  "gpt-4.1",
  "other",
];

const RES_OPTIONS = ["low", "medium", "high"];

function cx(...c: Array<string | false | null | undefined>) {
  return c.filter(Boolean).join(" ");
}

function Select({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: string[];
}) {
  return (
    <div>
      <div className="mb-1 text-sm text-gray-700">{label}</div>
      <Listbox value={value} onChange={onChange}>
        <div className="relative">
          <Listbox.Button className="relative w-full rounded-xl border border-gray-300 bg-white px-3 py-2 pr-8 text-left text-sm focus:border-gray-400 focus:ring-2 focus:ring-gray-900/10">
            <span className="block truncate">{value}</span>
            <span className="pointer-events-none absolute inset-y-0 right-2 flex items-center">
              <ChevronUpDownIcon className="h-5 w-5 text-gray-400" />
            </span>
          </Listbox.Button>
          <Transition
            as={Fragment}
            leave="transition ease-in duration-100"
            leaveFrom="opacity-100"
            leaveTo="opacity-0"
          >
            <Listbox.Options className="absolute z-50 mt-2 w-full rounded-xl bg-white py-1 text-sm shadow-lg ring-1 ring-black/5 focus:outline-none">
              {options.map((opt) => (
                <Listbox.Option key={opt} value={opt}>
                  {({ selected, active }) => (
                    <div
                      className={cx(
                        "flex cursor-pointer items-center justify-between px-3 py-2",
                        active && "bg-gray-50"
                      )}
                    >
                      <span>{opt}</span>
                      {selected ? (
                        <CheckIcon className="h-5 w-5 text-gray-600" />
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
  );
}

export function PromptSettingsSection() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");
  const [ok, setOk] = useState("");

  const [s, setS] = useState<SettingsState>({
    vision: { model: "gpt-4o-mini", resolution: "low", prompt: "" },
    pageDetect: { model: "gpt-4o-mini", resolution: "low", prompt: "" },
  });

  async function load() {
    setLoading(true);
    setErr("");
    setOk("");
    try {
      const res = await fetch(SETTINGS_API, { cache: "no-store" });
      if (!res.ok) throw new Error(`HTTP_${res.status}`);
      const data = (await res.json()) as SettingsState;
      setS({
        vision: data.vision,
        pageDetect: data.pageDetect,
        updatedAt: data.updatedAt ?? null,
      });
    } catch {
      setErr("Einstellungen konnten nicht geladen werden.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  async function save() {
    setSaving(true);
    setErr("");
    setOk("");
    try {
      const res = await fetch(SETTINGS_API, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          vision: s.vision,
          pageDetect: s.pageDetect,
        }),
      });
      if (!res.ok) throw new Error(`HTTP_${res.status}`);
      setOk("Gespeichert.");
    } catch {
      setErr("Speichern fehlgeschlagen.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="mx-auto w-full max-w-4xl px-4 py-10">
      <h1 className="text-2xl font-semibold">Prompt Einstellungen</h1>
      <p className="mt-1 text-sm text-gray-500">
        Lege Model, Bildauflösung und Prompts für Bilderkennung und
        Seitennummern-Erkennung fest.
      </p>

      {err && (
        <div className="mt-4 rounded-xl border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-700">
          {err}
        </div>
      )}
      {ok && (
        <div className="mt-4 rounded-xl border border-green-300 bg-green-50 px-3 py-2 text-sm text-green-700">
          {ok}
        </div>
      )}

      {loading ? (
        <div className="mt-6 space-y-3">
          <div className="h-10 w-full animate-pulse rounded-xl bg-gray-100" />
          <div className="h-28 w-full animate-pulse rounded-xl bg-gray-100" />
          <div className="h-10 w-full animate-pulse rounded-xl bg-gray-100" />
          <div className="h-28 w-full animate-pulse rounded-xl bg-gray-100" />
        </div>
      ) : (
        <>
          {/* Vision */}
          <div className="mt-6 rounded-2xl border bg-white p-5">
            <div className="mb-3 text-sm font-semibold">
              Bilderkennung (Vision)
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <Select
                label="Modell"
                value={s.vision.model}
                onChange={(v) =>
                  setS((p) => ({ ...p, vision: { ...p.vision, model: v } }))
                }
                options={MODEL_OPTIONS}
              />
              <Select
                label="Auflösung"
                value={s.vision.resolution}
                onChange={(v) =>
                  setS((p) => ({
                    ...p,
                    vision: { ...p.vision, resolution: v },
                  }))
                }
                options={RES_OPTIONS}
              />
            </div>
            <div className="mt-3">
              <div className="mb-1 text-sm text-gray-700">Prompt</div>
              <textarea
                value={s.vision.prompt}
                onChange={(e) =>
                  setS((p) => ({
                    ...p,
                    vision: { ...p.vision, prompt: e.target.value },
                  }))
                }
                rows={6}
                className="w-full rounded-xl border border-gray-300 px-3 py-2 text-sm focus:border-gray-400 focus:ring-2 focus:ring-gray-900/10"
                placeholder="Beschreibe, wie die Vision den Inhalt einer Seite erkennen/extrahieren soll…"
              />
            </div>
          </div>

          {/* Page detect */}
          <div className="mt-6 rounded-2xl border bg-white p-5">
            <div className="mb-3 text-sm font-semibold">
              Seitennummern-Erkennung
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <Select
                label="Modell"
                value={s.pageDetect.model}
                onChange={(v) =>
                  setS((p) => ({
                    ...p,
                    pageDetect: { ...p.pageDetect, model: v },
                  }))
                }
                options={MODEL_OPTIONS}
              />
              <Select
                label="Auflösung"
                value={s.pageDetect.resolution}
                onChange={(v) =>
                  setS((p) => ({
                    ...p,
                    pageDetect: { ...p.pageDetect, resolution: v },
                  }))
                }
                options={RES_OPTIONS}
              />
            </div>
            <div className="mt-3">
              <div className="mb-1 text-sm text-gray-700">Prompt</div>
              <textarea
                value={s.pageDetect.prompt}
                onChange={(e) =>
                  setS((p) => ({
                    ...p,
                    pageDetect: { ...p.pageDetect, prompt: e.target.value },
                  }))
                }
                rows={6}
                className="w-full rounded-xl border border-gray-300 px-3 py-2 text-sm focus:border-gray-400 focus:ring-2 focus:ring-gray-900/10"
                placeholder="Beschreibe, wie die Seitennummer erkannt/extrahiert werden soll…"
              />
            </div>
          </div>

          <div className="mt-6 flex items-center justify-end gap-2">
            <button
              type="button"
              className="rounded px-3 py-1.5 hover:bg-gray-50"
              onClick={() => void load()}
              disabled={saving}
            >
              Neu laden
            </button>
            <button
              type="button"
              onClick={() => void save()}
              disabled={saving}
              className={cx(
                "rounded bg-black px-4 py-2 text-white",
                saving && "opacity-60"
              )}
            >
              {saving ? "Speichere…" : "Speichern"}
            </button>
          </div>
        </>
      )}
    </section>
  );
}

/* ======================= QR Types ======================= */
type GenState =
  | { status: "idle" }
  | { status: "working" }
  | { status: "done"; token: string; url: string; dataUrl?: string }
  | { status: "error"; message: string };

type QrApiOk = { token: string; url: string };
type QrApiErr = { error: string };

/* ======================= Users Types ======================= */
type UserRow = {
  _id: string;
  email: string;
  firstName?: string;
  lastName?: string;
  role?: string;
  createdAt?: string | Date;
};

const USERS_API = "/api/users";

/* ======================= Books Types ======================= */
type BookRow = {
  _id: string;
  title: string;
  ownerEmail: string;
  totalPages: number;
  scannedPages: number;
  createdAt?: string | Date;
};

const BOOKS_API = "/api/admin/notebooks";

function formatDate(d?: string | Date) {
  if (!d) return "–";
  const dt = typeof d === "string" ? new Date(d) : d;
  try {
    return new Intl.DateTimeFormat("de-AT", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(dt);
  } catch {
    return "–";
  }
}
function usernameFromEmail(email: string) {
  const local = email.split("@")[0] || "";
  return local || "—";
}
function roleBadgeClass(role?: string) {
  return role === "admin"
    ? "bg-amber-100 text-amber-800"
    : "bg-gray-100 text-gray-700";
}

/* ======================= Users Section ======================= */
function UsersSection() {
  const [users, setUsers] = useState<UserRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string>("");

  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState<"" | "admin" | "user">("");

  // dialogs
  const [editOpen, setEditOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<UserRow | null>(null);
  const [editFirst, setEditFirst] = useState("");
  const [editLast, setEditLast] = useState("");
  const [editRole, setEditRole] = useState<"admin" | "user">("user");
  const [saving, setSaving] = useState(false);

  const [delOpen, setDelOpen] = useState(false);
  const [delTarget, setDelTarget] = useState<UserRow | null>(null);
  const [deleting, setDeleting] = useState(false);

  const roles = [
    { id: "admin", label: "Admin" },
    { id: "user", label: "User" },
  ] as const;

  async function loadUsers() {
    setLoading(true);
    setErr("");
    try {
      const res = await fetch(USERS_API, { cache: "no-store" });
      if (!res.ok) throw new Error(`HTTP_${res.status}`);
      const data = await res.json();
      // <-- FIX: akzeptiert Array ODER { users: [...] }
      const rows: UserRow[] = Array.isArray(data) ? data : data?.users ?? [];
      setUsers(rows);
    } catch (e) {
      setErr("Konnte Benutzer nicht laden.");
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => {
    void loadUsers();
  }, []);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return users
      .filter((u) => (roleFilter ? (u.role ?? "user") === roleFilter : true))
      .filter((u) => {
        if (!q) return true;
        const name = `${u.firstName ?? ""} ${u.lastName ?? ""}`.toLowerCase();
        const email = (u.email ?? "").toLowerCase();
        const uname = usernameFromEmail(u.email ?? "").toLowerCase();
        return name.includes(q) || email.includes(q) || uname.includes(q);
      });
  }, [users, search, roleFilter]);

  function openEdit(u: UserRow) {
    setEditTarget(u);
    setEditFirst(u.firstName ?? "");
    setEditLast(u.lastName ?? "");
    setEditRole((u.role as "admin" | "user") ?? "user");
    setEditOpen(true);
  }
  async function saveEdit() {
    if (!editTarget?._id) return;
    try {
      setSaving(true);
      const res = await fetch(`/api/users/${editTarget._id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          firstName: editFirst.trim(),
          lastName: editLast.trim(),
          role: editRole,
        }),
      });
      if (!res.ok) throw new Error(`HTTP_${res.status}`);
      setEditOpen(false);
      setEditTarget(null);
      await loadUsers();
    } catch {
      toast.error("Speichern fehlgeschlagen.");
    } finally {
      setSaving(false);
    }
  }

  function openDelete(u: UserRow) {
    setDelTarget(u);
    setDelOpen(true);
  }
  async function doDelete() {
    if (!delTarget?._id) return;
    try {
      setDeleting(true);
      const res = await fetch(`/api/users/${delTarget._id}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error(`HTTP_${res.status}`);
      setDelOpen(false);
      setDelTarget(null);
      await loadUsers();
    } catch {
      toast.error("Löschen fehlgeschlagen.");
    } finally {
      setDeleting(false);
    }
  }

  return (
    <section className="mx-auto w-full max-w-6xl px-4 py-10">
      <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Benutzerverwaltung</h1>
          <p className="mt-1 text-sm text-gray-500">
            Verwalte Konten, Rollen und Stammdaten.
          </p>
        </div>
      </div>

      {/* Controls */}
      <div className="mb-5 grid gap-3 sm:grid-cols-3">
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Suchen (Name, Benutzername, E-Mail)…"
          className="w-full rounded-xl border border-gray-300 bg-white px-3 py-2 text-sm placeholder:text-gray-400 focus:border-gray-400 focus:ring-2 focus:ring-gray-900/10"
        />
        <Listbox
          value={roleFilter}
          onChange={(v: "" | "admin" | "user") => setRoleFilter(v)}
        >
          <div className="relative">
            <Listbox.Button className="relative w-full rounded-xl border border-gray-300 bg-white px-3 py-2 pr-8 text-left text-sm focus:border-gray-400 focus:ring-2 focus:ring-gray-900/10">
              <span className="block truncate">
                {roleFilter === ""
                  ? "Alle Rollen"
                  : roleFilter === "admin"
                  ? "Admin"
                  : "User"}
              </span>
              <span className="pointer-events-none absolute inset-y-0 right-2 flex items-center">
                <ChevronUpDownIcon className="h-5 w-5 text-gray-400" />
              </span>
            </Listbox.Button>
            <Transition
              as={Fragment}
              leave="transition ease-in duration-100"
              leaveFrom="opacity-100"
              leaveTo="opacity-0"
            >
              <Listbox.Options className="absolute z-50 mt-2 w-full rounded-xl bg-white py-1 text-sm shadow-lg ring-1 ring-black/5 focus:outline-none">
                <Listbox.Option value="">
                  {({ selected, active }) => (
                    <div
                      className={cx(
                        "flex cursor-pointer items-center justify-between px-3 py-2",
                        active && "bg-gray-50"
                      )}
                    >
                      <span>Alle Rollen</span>
                      {selected ? (
                        <CheckIcon className="h-5 w-5 text-gray-600" />
                      ) : null}
                    </div>
                  )}
                </Listbox.Option>
                {roles.map((r) => (
                  <Listbox.Option key={r.id} value={r.id}>
                    {({ selected, active }) => (
                      <div
                        className={cx(
                          "flex cursor-pointer items-center justify-between px-3 py-2",
                          active && "bg-gray-50"
                        )}
                      >
                        <span>{r.label}</span>
                        {selected ? (
                          <CheckIcon className="h-5 w-5 text-gray-600" />
                        ) : null}
                      </div>
                    )}
                  </Listbox.Option>
                ))}
              </Listbox.Options>
            </Transition>
          </div>
        </Listbox>

        <div className="hidden sm:block" />
      </div>

      {/* Fehler */}
      {err ? (
        <div className="mb-4 rounded-xl border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-700">
          {err}
        </div>
      ) : null}

      {/* Loading */}
      {loading ? (
        <div className="space-y-2">
          {Array.from({ length: 6 }).map((_, i) => (
            <div
              key={i}
              className="h-12 w-full animate-pulse rounded-xl bg-gray-100"
            />
          ))}
        </div>
      ) : (
        <>
          {/* Desktop-Tabelle */}
          <div className="hidden overflow-visible rounded-2xl border bg-white sm:block">
            <table className="w-full table-fixed text-sm">
              <thead className="bg-gray-50 text-gray-600">
                <tr>
                  <th className="px-4 py-3 text-left w-[26%]">Name</th>
                  <th className="px-4 py-3 text-left w-[18%]">Benutzername</th>
                  <th className="px-4 py-3 text-left w-[28%]">E-Mail</th>
                  <th className="px-4 py-3 text-left w-[12%]">Rolle</th>
                  <th className="px-4 py-3 text-left w-[12%]">Registriert</th>
                  <th className="px-4 py-3 text-left w-[4%]"></th>
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 ? (
                  <tr>
                    <td
                      colSpan={6}
                      className="px-4 py-6 text-center text-gray-500"
                    >
                      Keine Benutzer gefunden.
                    </td>
                  </tr>
                ) : (
                  filtered.map((u) => {
                    const name =
                      [u.firstName, u.lastName].filter(Boolean).join(" ") ||
                      "—";
                    const uname = usernameFromEmail(u.email);
                    return (
                      <tr key={u._id} className="border-t">
                        <td className="truncate px-4 py-3">{name}</td>
                        <td className="truncate px-4 py-3 font-mono text-gray-700">
                          {uname}
                        </td>
                        <td className="truncate px-4 py-3">{u.email}</td>
                        <td className="px-4 py-3">
                          <span
                            className={cx(
                              "inline-flex items-center rounded-full px-2 py-0.5 text-xs",
                              roleBadgeClass(u.role)
                            )}
                          >
                            {u.role ?? "user"}
                          </span>
                        </td>
                        <td className="px-4 py-3">{formatDate(u.createdAt)}</td>
                        <td className="px-4 py-3">
                          <Menu
                            as="div"
                            className="relative inline-block text-left"
                          >
                            <Menu.Button className="rounded-md p-1 hover:bg-gray-50">
                              <EllipsisHorizontalIcon className="h-5 w-5 text-gray-600" />
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
                              <Menu.Items className="absolute right-0 z-50 mt-2 w-52 origin-top-right rounded-xl bg-white p-1 text-sm shadow-lg ring-1 ring-black/5 focus:outline-none">
                                <Menu.Item>
                                  {({ active }) => (
                                    <button
                                      className={cx(
                                        "flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left",
                                        active && "bg-gray-50"
                                      )}
                                      onClick={() => openEdit(u)}
                                    >
                                      <PencilSquareIcon className="h-4 w-4" />{" "}
                                      Umbenennen/Rolle
                                    </button>
                                  )}
                                </Menu.Item>
                                <Menu.Item>
                                  {({ active }) => (
                                    <button
                                      className={cx(
                                        "flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left",
                                        active && "bg-gray-50"
                                      )}
                                      onClick={() =>
                                        toast.success("Reset-E-Mail gesendet (Demo).")
                                      }
                                    >
                                      <EnvelopeOpenIcon className="h-4 w-4" />{" "}
                                      Reset-E-Mail senden
                                    </button>
                                  )}
                                </Menu.Item>
                                <div className="my-1 h-px bg-gray-100" />
                                <Menu.Item>
                                  {({ active }) => (
                                    <button
                                      className={cx(
                                        "flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-red-600",
                                        active && "bg-red-50"
                                      )}
                                      onClick={() => openDelete(u)}
                                    >
                                      <TrashIcon className="h-4 w-4" /> Löschen
                                    </button>
                                  )}
                                </Menu.Item>
                              </Menu.Items>
                            </Transition>
                          </Menu>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Mobile Cards */}
          <div className="space-y-3 sm:hidden">
            {filtered.length === 0 ? (
              <div className="rounded-xl border bg-white p-4 text-sm text-gray-500">
                Keine Benutzer gefunden.
              </div>
            ) : (
              filtered.map((u) => {
                const name =
                  [u.firstName, u.lastName].filter(Boolean).join(" ") || "—";
                const uname = usernameFromEmail(u.email);
                return (
                  <div key={u._id} className="rounded-xl border bg-white p-4">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="font-medium">{name}</div>
                        <div className="mt-1 grid gap-1 text-sm text-gray-600">
                          <div>
                            <span className="text-gray-500">
                              Benutzername:{" "}
                            </span>
                            <span className="font-mono text-gray-800">
                              {uname}
                            </span>
                          </div>
                          <div>
                            <span className="text-gray-500">E-Mail: </span>
                            <span>{u.email}</span>
                          </div>
                          <div>
                            <span className="text-gray-500">Rolle: </span>
                            <span
                              className={cx(
                                "ml-1 rounded-full px-2 py-0.5 text-xs",
                                roleBadgeClass(u.role)
                              )}
                            >
                              {u.role ?? "user"}
                            </span>
                          </div>
                          <div>
                            <span className="text-gray-500">Registriert: </span>
                            <span>{formatDate(u.createdAt)}</span>
                          </div>
                        </div>
                      </div>

                      <Menu
                        as="div"
                        className="relative -mr-2 inline-block text-left"
                      >
                        <Menu.Button className="rounded-md p-1 hover:bg-gray-50">
                          <EllipsisHorizontalIcon className="h-6 w-6 text-gray-600" />
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
                          <Menu.Items className="absolute right-0 z-50 mt-2 w-48 origin-top-right rounded-xl bg-white p-1 text-sm shadow-lg ring-1 ring-black/5 focus:outline-none">
                            <Menu.Item>
                              {({ active }) => (
                                <button
                                  className={cx(
                                    "flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left",
                                    active && "bg-gray-50"
                                  )}
                                  onClick={() => openEdit(u)}
                                >
                                  <PencilSquareIcon className="h-4 w-4" />{" "}
                                  Umbenennen/Rolle
                                </button>
                              )}
                            </Menu.Item>
                            <Menu.Item>
                              {({ active }) => (
                                <button
                                  className={cx(
                                    "flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left",
                                    active && "bg-gray-50"
                                  )}
                                  onClick={() =>
                                    toast.success("Reset-E-Mail gesendet (Demo).")
                                  }
                                >
                                  <EnvelopeOpenIcon className="h-4 w-4" />{" "}
                                  Reset-E-Mail senden
                                </button>
                              )}
                            </Menu.Item>
                            <div className="my-1 h-px bg-gray-100" />
                            <Menu.Item>
                              {({ active }) => (
                                <button
                                  className={cx(
                                    "flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-red-600",
                                    active && "bg-red-50"
                                  )}
                                  onClick={() => openDelete(u)}
                                >
                                  <TrashIcon className="h-4 w-4" /> Löschen
                                </button>
                              )}
                            </Menu.Item>
                          </Menu.Items>
                        </Transition>
                      </Menu>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </>
      )}

      {/* Edit Dialog */}
      <Transition show={editOpen} as={Fragment}>
        <Dialog onClose={() => setEditOpen(false)} className="relative z-50">
          <div className="fixed inset-0 bg-black/40" aria-hidden="true" />
          <div className="fixed inset-0 flex items-center justify-center p-4">
            <Dialog.Panel className="w-full max-w-md rounded-2xl bg-white p-5 shadow-xl">
              <Dialog.Title className="text-base font-semibold">
                Benutzer bearbeiten
              </Dialog.Title>
              <div className="mt-3 space-y-3">
                <label className="block text-sm">
                  <span className="text-gray-700">Vorname</span>
                  <input
                    value={editFirst}
                    onChange={(e) => setEditFirst(e.target.value)}
                    className="mt-1 w-full rounded-xl border border-gray-300 px-3 py-2 text-sm focus:border-gray-400 focus:ring-2 focus:ring-gray-900/10"
                  />
                </label>
                <label className="block text-sm">
                  <span className="text-gray-700">Nachname</span>
                  <input
                    value={editLast}
                    onChange={(e) => setEditLast(e.target.value)}
                    className="mt-1 w-full rounded-xl border border-gray-300 px-3 py-2 text-sm focus:border-gray-400 focus:ring-2 focus:ring-gray-900/10"
                  />
                </label>

                <div className="text-sm text-gray-700">Rolle</div>
                <Listbox
                  value={editRole}
                  onChange={(v: "admin" | "user") => setEditRole(v)}
                >
                  <div className="relative">
                    <Listbox.Button className="relative w-full rounded-xl border border-gray-300 bg-white px-3 py-2 pr-8 text-left text-sm focus:border-gray-400 focus:ring-2 focus:ring-gray-900/10">
                      <span className="block truncate">
                        {editRole === "admin" ? "Admin" : "User"}
                      </span>
                      <span className="pointer-events-none absolute inset-y-0 right-2 flex items-center">
                        <ChevronUpDownIcon className="h-5 w-5 text-gray-400" />
                      </span>
                    </Listbox.Button>
                    <Transition
                      as={Fragment}
                      leave="transition ease-in duration-100"
                      leaveFrom="opacity-100"
                      leaveTo="opacity-0"
                    >
                      <Listbox.Options className="absolute z-50 mt-2 w-full rounded-xl bg-white py-1 text-sm shadow-lg ring-1 ring-black/5 focus:outline-none">
                        {["admin", "user"].map((r) => (
                          <Listbox.Option key={r} value={r as "admin" | "user"}>
                            {({ selected, active }) => (
                              <div
                                className={cx(
                                  "flex cursor-pointer items-center justify-between px-3 py-2",
                                  active && "bg-gray-50"
                                )}
                              >
                                <span>{r === "admin" ? "Admin" : "User"}</span>
                                {selected ? (
                                  <CheckIcon className="h-5 w-5 text-gray-600" />
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
              <div className="mt-5 flex items-center justify-end gap-2">
                <button
                  className="rounded px-3 py-1.5 hover:bg-gray-50"
                  onClick={() => setEditOpen(false)}
                  disabled={saving}
                >
                  Abbrechen
                </button>
                <button
                  className={cx(
                    "rounded bg-black px-3 py-1.5 text-white",
                    saving && "opacity-60"
                  )}
                  onClick={() => void saveEdit()}
                  disabled={saving}
                >
                  {saving ? "Speichere…" : "Speichern"}
                </button>
              </div>
            </Dialog.Panel>
          </div>
        </Dialog>
      </Transition>

      {/* Delete Dialog */}
      <Transition show={delOpen} as={Fragment}>
        <Dialog onClose={() => setDelOpen(false)} className="relative z-50">
          <div className="fixed inset-0 bg-black/40" aria-hidden="true" />
          <div className="fixed inset-0 flex items-center justify-center p-4">
            <Dialog.Panel className="w-full max-w-md rounded-2xl bg-white p-5 shadow-xl">
              <Dialog.Title className="text-base font-semibold text-red-600">
                Benutzer löschen
              </Dialog.Title>
              <p className="mt-2 text-sm text-gray-600">
                Möchtest du{" "}
                <span className="font-medium">
                  {delTarget
                    ? [delTarget.firstName, delTarget.lastName]
                        .filter(Boolean)
                        .join(" ") || delTarget.email
                    : ""}
                </span>{" "}
                wirklich löschen? Diese Aktion kann nicht rückgängig gemacht
                werden.
              </p>
              <div className="mt-5 flex items-center justify-end gap-2">
                <button
                  className="rounded px-3 py-1.5 hover:bg-gray-50"
                  onClick={() => setDelOpen(false)}
                  disabled={deleting}
                >
                  Abbrechen
                </button>
                <button
                  className={cx(
                    "rounded bg-red-600 px-3 py-1.5 text-white",
                    deleting && "opacity-60"
                  )}
                  onClick={() => void doDelete()}
                  disabled={deleting}
                >
                  {deleting ? "Lösche…" : "Löschen"}
                </button>
              </div>
            </Dialog.Panel>
          </div>
        </Dialog>
      </Transition>
    </section>
  );
}

type TemplateId = "a5-200" | "a5-140" | "a5-100";
type Template = { id: TemplateId; label: string; pages: number };

const TEMPLATE_OPTIONS: Template[] = [
  { id: "a5-200", label: "Powerbook A5 - 200 Seiten", pages: 200 },
  { id: "a5-140", label: "Powerbook A5 - 140 Seiten", pages: 140 },
  { id: "a5-100", label: "Powerbook A5 - 100 Seiten", pages: 100 },
];

/* ======================= Books Section (nur relevante Klassen tweaked) ======================= */
/* ======================= Books Section (Details / Rename / Delete) ======================= */
function BooksSection() {
  const [rows, setRows] = useState<BookRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");

  const [q, setQ] = useState("");

  // ── Modals / UI-States
  const [renameOpen, setRenameOpen] = useState(false);
  const [renameTarget, setRenameTarget] = useState<BookRow | null>(null);
  const [renameTitle, setRenameTitle] = useState("");
  const [renaming, setRenaming] = useState(false);

  const [detailsOpen, setDetailsOpen] = useState(false);
  const [detailsData, setDetailsData] = useState<any>(null); // nur Anzeige
  const [detailsLoading, setDetailsLoading] = useState(false);

  const [delOpen, setDelOpen] = useState(false);
  const [delTarget, setDelTarget] = useState<BookRow | null>(null);
  const [deleting, setDeleting] = useState(false);

  const [template, setTemplate] = useState<TemplateId>("a5-200"); // <- Auswahl gespeichert
  const [createPowerbookDropdownOpen, setCreatePowerbookDropdownOpen] =
    useState(false);
  const [creating, setCreating] = useState(false);

  const router = useRouter();

  type GenState =
    | { status: "idle" }
    | { status: "working" }
    | { status: "done"; token: string; url: string; dataUrl?: string }
    | { status: "error"; message: string };

  // ...innerhalb BooksSection():
  const [qrState, setQrState] = useState<GenState>({ status: "idle" });
  const [lastNotebookId, setLastNotebookId] = useState<string>("");

  // ── Laden
  async function loadBooks() {
    try {
      setLoading(true);
      setErr("");
      const res = await fetch(BOOKS_API, { cache: "no-store" });
      if (!res.ok) throw new Error(`HTTP_${res.status}`);
      const data = await res.json();
      const list: BookRow[] = Array.isArray(data)
        ? data
        : data?.notebooks ?? [];
      setRows(list);
    } catch {
      setErr("Konnte Notizbücher nicht laden.");
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => {
    void loadBooks();
  }, []);

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    if (!needle) return rows;
    return rows.filter(
      (r) =>
        r.title.toLowerCase().includes(needle) ||
        (r.ownerEmail || "").toLowerCase().includes(needle)
    );
  }, [rows, q]);

  // ── Aktionen
  function openRename(b: BookRow) {
    setRenameTarget(b);
    setRenameTitle(b.title);
    setRenameOpen(true);
  }
  async function doRename() {
    if (!renameTarget?._id) return;
    try {
      setRenaming(true);
      const res = await fetch(`/api/admin/notebooks/${renameTarget._id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: renameTitle.trim() }),
      });
      if (!res.ok) throw new Error("PATCH failed");
      setRenameOpen(false);
      setRenameTarget(null);
      await loadBooks();
    } catch {
      toast.error("Umbenennen fehlgeschlagen.");
    } finally {
      setRenaming(false);
    }
  }

  async function openDetails(b: BookRow) {
    setDetailsData(null);
    setDetailsLoading(true);
    setDetailsOpen(true);
    try {
      const res = await fetch(`/api/admin/notebooks/${b._id}`, {
        cache: "no-store",
      });
      if (!res.ok) throw new Error("GET detail failed");
      const data = await res.json();
      setDetailsData(data);
    } catch {
      setDetailsData({ error: "Details konnten nicht geladen werden." });
    } finally {
      setDetailsLoading(false);
    }
  }

  function openDelete(b: BookRow) {
    setDelTarget(b);
    setDelOpen(true);
  }
  async function doDelete() {
    if (!delTarget?._id) return;
    try {
      setDeleting(true);
      const res = await fetch(`/api/admin/notebooks/${delTarget._id}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("DELETE failed");
      setDelOpen(false);
      setDelTarget(null);
      await loadBooks();
    } catch {
      toast.error("Löschen fehlgeschlagen.");
    } finally {
      setDeleting(false);
    }
  }

  async function createNotebook(title: string, pages: number) {
    setCreating(true);
    setQrState({ status: "working" });
    try {
      const res = await fetch("/api/notebooks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, noOwner: true, pages }), // 👈 Seiten mitsenden
      });
      if (!res.ok) throw new Error("Create failed");

      const json = await res.json();
      const nbId = String(json?.item?.id || "");
      setLastNotebookId(nbId);

      const qr = json?.qr as { token?: string; url?: string } | null;

      if (qr?.token && qr?.url) {
        const dataUrl = await QRCode.toDataURL(String(qr.url), {
          errorCorrectionLevel: "M",
          margin: 2,
          scale: 6,
        });
        setQrState({ status: "done", token: qr.token, url: qr.url, dataUrl });
      } else {
        setQrState({
          status: "error",
          message: "QR konnte nicht erzeugt werden.",
        });
      }

      await loadBooks();
    } catch (e) {
      console.error(e);
      setQrState({ status: "error", message: "Erstellung fehlgeschlagen." });
    } finally {
      setCreating(false);
    }
  }

  return (
    <section className="mx-auto w-full max-w-6xl px-4 py-10">
      <div className="mb-5">
        <h1 className="text-2xl font-semibold">Powerbooks &amp; Scans</h1>
        <p className="mt-1 text-sm text-gray-500">
          Alle Notizbücher mit Besitzer, Seiten und Scan-Status.
        </p>
      </div>

      <div>
        {/* Powerbook Informationen eingeben wie z.b. Art des Powerbooks im Dropdown */}
      </div>

      <div className="mb-4 flex flex-row items-center gap-3">
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Suchen (Titel, E-Mail)…"
          className="w-full rounded-xl border border-gray-300 bg-white px-3 py-2 text-sm placeholder:text-gray-400 focus:border-gray-400 focus:ring-2 focus:ring-gray-900/10"
        />

        <Button onClick={() => setCreatePowerbookDropdownOpen(true)}>
          Neues Powerbook erstellen
        </Button>
      </div>

      {createPowerbookDropdownOpen && (
        <div className="w-full mb-4">
          <DropDown
            value={template}
            onValueChange={(v: TemplateId) => setTemplate(v)}
          >
            <SelectTrigger className="min-w-[220px] w-full rounded-xl border-gray-300 py-2">
              <SelectValue placeholder="Vorlage wählen" />
            </SelectTrigger>
            <SelectContent>
              {TEMPLATE_OPTIONS.map((opt) => (
                <SelectItem key={opt.id} value={opt.id}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </DropDown>
          <div>
            <Button
              className="mt-2 w-full"
              onClick={() => {
                const t = TEMPLATE_OPTIONS.find((x) => x.id === template);
                createNotebook(t?.label || "Neues Powerbook", t?.pages ?? 0);
                setCreatePowerbookDropdownOpen(false);
              }}
            >
              Powerbook erstellen
            </Button>
          </div>
        </div>
      )}

      {qrState.status === "done" && (
        <section className="mb-6 rounded-2xl border bg-white p-4">
          <div className="text-sm">
            <div className="mb-1">
              <span className="font-medium">Notebook ID:</span>{" "}
              <code className="break-all">{lastNotebookId || "—"}</code>
            </div>
            <div className="mb-1">
              <span className="font-medium">Token:</span>{" "}
              <code className="break-all">{qrState.token}</code>
            </div>
            <div className="mb-3">
              <span className="font-medium">URL:</span>{" "}
              <a
                href={qrState.url}
                className="text-blue-600 underline break-all"
                target="_blank"
                rel="noreferrer"
              >
                {qrState.url}
              </a>
            </div>

            {qrState.dataUrl && (
              <div className="flex items-start gap-6">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={qrState.dataUrl}
                  alt="QR Code"
                  className="h-48 w-48 rounded-lg border bg-white"
                />
                <div className="space-y-2">
                  <a
                    href={qrState.dataUrl}
                    download={`powerbook-${lastNotebookId || "qr"}.png`}
                    className="inline-block rounded-xl bg-gray-900 px-3 py-2 text-white hover:bg-black"
                  >
                    PNG herunterladen
                  </a>
                  <p className="text-xs text-gray-500">
                    Scannen führt zu{" "}
                    <span className="font-mono">{qrState.url}</span>
                  </p>
                </div>
              </div>
            )}
          </div>
        </section>
      )}

      {qrState.status === "error" && (
        <div className="mb-6 rounded-xl border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-700">
          {qrState.message}
        </div>
      )}

      {err ? (
        <div className="mb-4 rounded-xl border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-700">
          {err}
        </div>
      ) : null}

      {loading ? (
        <div className="space-y-2">
          {Array.from({ length: 6 }).map((_, i) => (
            <div
              key={i}
              className="h-12 w-full animate-pulse rounded-xl bg-gray-100"
            />
          ))}
        </div>
      ) : (
        <div className="hidden overflow-visible rounded-2xl border bg-white md:block">
          <table className="w-full table-fixed text-sm">
            <thead className="bg-gray-50 text-gray-600">
              <tr>
                <th className="px-4 py-3 text-left w-[28%]">Titel</th>
                <th className="px-4 py-3 text-left w-[32%]">
                  Besitzer (E-Mail)
                </th>
                <th className="px-4 py-3 text-left w-[10%]">Seiten</th>
                <th className="px-4 py-3 text-left w-[10%]">Scans</th>
                <th className="px-4 py-3 text-left w-[14%]">Angelegt</th>
                <th className="px-4 py-3 text-left w-[6%]"></th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td
                    colSpan={6}
                    className="px-4 py-6 text-center text-gray-500"
                  >
                    Keine Notizbücher gefunden.
                  </td>
                </tr>
              ) : (
                filtered.map((b) => (
                  <tr key={b._id} className="border-t">
                    <td className="truncate px-4 py-3">{b.title}</td>
                    <td className="truncate px-4 py-3">{b.ownerEmail}</td>
                    <td className="px-4 py-3">{b.totalPages}</td>
                    <td className="px-4 py-3">{b.scannedPages}</td>
                    <td className="px-4 py-3">{formatDate(b.createdAt)}</td>
                    <td className="px-4 py-3">
                      <Menu
                        as="div"
                        className="relative inline-block text-left"
                      >
                        <Menu.Button className="rounded-md p-1 hover:bg-gray-50">
                          <EllipsisHorizontalIcon className="h-5 w-5 text-gray-600" />
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
                          <Menu.Items className="absolute right-0 z-50 mt-2 w-56 origin-top-right rounded-xl bg-white p-1 text-sm shadow-lg ring-1 ring-black/5 focus:outline-none">
                            <Menu.Item>
                              {({ active }) => (
                                <button
                                  className={cx(
                                    "flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left",
                                    active && "bg-gray-50"
                                  )}
                                  onClick={() => openRename(b)}
                                >
                                  <PencilIcon className="h-4 w-4" /> Umbenennen
                                </button>
                              )}
                            </Menu.Item>
                            <Menu.Item>
                              {({ active }) => (
                                <button
                                  className={cx(
                                    "flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left",
                                    active && "bg-gray-50"
                                  )}
                                  onClick={() => void openDetails(b)}
                                >
                                  <InformationCircleIcon className="h-4 w-4" />{" "}
                                  Details
                                </button>
                              )}
                            </Menu.Item>
                            <div className="my-1 h-px bg-gray-100" />
                            <Menu.Item>
                              {({ active }) => (
                                <button
                                  className={cx(
                                    "flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-red-600",
                                    active && "bg-red-50"
                                  )}
                                  onClick={() => openDelete(b)}
                                >
                                  <TrashIcon className="h-4 w-4" /> Löschen
                                </button>
                              )}
                            </Menu.Item>
                          </Menu.Items>
                        </Transition>
                      </Menu>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Rename Dialog */}
      <Transition show={renameOpen} as={Fragment}>
        <Dialog onClose={() => setRenameOpen(false)} className="relative z-50">
          <div className="fixed inset-0 bg-black/40" aria-hidden="true" />
          <div className="fixed inset-0 flex items-center justify-center p-4">
            <Dialog.Panel className="w-full max-w-md rounded-2xl bg-white p-5 shadow-xl">
              <Dialog.Title className="text-base font-semibold">
                Powerbook umbenennen
              </Dialog.Title>
              <div className="mt-3 space-y-3">
                <label className="block text-sm">
                  <span className="text-gray-700">Titel</span>
                  <input
                    value={renameTitle}
                    onChange={(e) => setRenameTitle(e.target.value)}
                    className="mt-1 w-full rounded-xl border border-gray-300 px-3 py-2 text-sm focus:border-gray-400 focus:ring-2 focus:ring-gray-900/10"
                  />
                </label>
              </div>
              <div className="mt-5 flex items-center justify-end gap-2">
                <button
                  className="rounded px-3 py-1.5 hover:bg-gray-50"
                  onClick={() => setRenameOpen(false)}
                  disabled={renaming}
                >
                  Abbrechen
                </button>
                <button
                  className={cx(
                    "rounded bg-black px-3 py-1.5 text-white",
                    renaming && "opacity-60"
                  )}
                  onClick={() => void doRename()}
                  disabled={renaming}
                >
                  {renaming ? "Speichere…" : "Speichern"}
                </button>
              </div>
            </Dialog.Panel>
          </div>
        </Dialog>
      </Transition>

      {/* Details Dialog */}
      <Transition show={detailsOpen} as={Fragment}>
        <Dialog onClose={() => setDetailsOpen(false)} className="relative z-50">
          <div className="fixed inset-0 bg-black/40" aria-hidden="true" />
          <div className="fixed inset-0 flex items-center justify-center p-4">
            <Dialog.Panel className="w-full max-w-lg rounded-2xl bg-white p-5 shadow-xl">
              <Dialog.Title className="text-base font-semibold">
                Powerbook Details
              </Dialog.Title>
              <div className="mt-3 text-sm">
                {detailsLoading ? (
                  <div className="h-24 animate-pulse rounded-xl bg-gray-100" />
                ) : detailsData?.error ? (
                  <div className="rounded-xl border border-red-300 bg-red-50 px-3 py-2 text-red-700">
                    {detailsData.error}
                  </div>
                ) : detailsData ? (
                  <div className="space-y-2">
                    <div>
                      <span className="text-gray-500">Titel:</span>{" "}
                      <span className="font-medium">{detailsData.title}</span>
                    </div>
                    <div>
                      <span className="text-gray-500">Besitzer:</span>{" "}
                      {detailsData.ownerEmail}
                    </div>
                    <div>
                      <span className="text-gray-500">Seiten:</span>{" "}
                      {detailsData.totalPages}
                    </div>
                    <div>
                      <span className="text-gray-500">Scans:</span>{" "}
                      {detailsData.scannedPages}
                    </div>
                    <div>
                      <span className="text-gray-500">Geteilt mit:</span>{" "}
                      {detailsData.sharedWithCount ?? 0}
                    </div>
                    <div>
                      <span className="text-gray-500">Angelegt:</span>{" "}
                      {formatDate(detailsData.createdAt)}
                    </div>
                    {detailsData.projectId ? (
                      <div>
                        <span className="text-gray-500">Projekt:</span>{" "}
                        <span className="font-mono">
                          {detailsData.projectId}
                        </span>
                      </div>
                    ) : null}
                  </div>
                ) : null}
              </div>
              <div className="mt-5 flex items-center justify-end">
                <button
                  className="rounded px-3 py-1.5 hover:bg-gray-50"
                  onClick={() => setDetailsOpen(false)}
                >
                  Schließen
                </button>
              </div>
            </Dialog.Panel>
          </div>
        </Dialog>
      </Transition>

      {/* Delete Dialog */}
      <Transition show={delOpen} as={Fragment}>
        <Dialog onClose={() => setDelOpen(false)} className="relative z-50">
          <div className="fixed inset-0 bg-black/40" aria-hidden="true" />
          <div className="fixed inset-0 flex items-center justify-center p-4">
            <Dialog.Panel className="w-full max-w-md rounded-2xl bg-white p-5 shadow-xl">
              <Dialog.Title className="text-base font-semibold text-red-600">
                Powerbook löschen
              </Dialog.Title>
              <p className="mt-2 text-sm text-gray-600">
                Möchtest du{" "}
                <span className="font-medium">{delTarget?.title}</span> wirklich
                löschen? Zugehörige Seiten/Scans werden entfernt. Diese Aktion
                kann nicht rückgängig gemacht werden.
              </p>
              <div className="mt-5 flex items-center justify-end gap-2">
                <button
                  className="rounded px-3 py-1.5 hover:bg-gray-50"
                  onClick={() => setDelOpen(false)}
                  disabled={deleting}
                >
                  Abbrechen
                </button>
                <button
                  className={cx(
                    "rounded bg-red-600 px-3 py-1.5 text-white",
                    deleting && "opacity-60"
                  )}
                  onClick={() => void doDelete()}
                  disabled={deleting}
                >
                  {deleting ? "Lösche…" : "Löschen"}
                </button>
              </div>
            </Dialog.Panel>
          </div>
        </Dialog>
      </Transition>
    </section>
  );
}

/* ======================= Admin Page Client ======================= */
export default function AdminPageClient() {
  const [notebookId, setNotebookId] = useState("");
  const [state, setState] = useState<GenState>({ status: "idle" });
  const [view, setView] = useState<"qr" | "users" | "books" | "prompt">("qr");

  async function handleGenerate(e?: React.MouseEvent<HTMLButtonElement>) {
    e?.preventDefault();
    const id = notebookId.trim();
    if (!id) {
      setState({
        status: "error",
        message: "Bitte eine Notebook ID eingeben.",
      });
      return;
    }
    try {
      setState({ status: "working" });
      const res = await fetch(
        `/api/qr/single?notebookId=${encodeURIComponent(id)}`
      );
      const data: QrApiOk | QrApiErr = await res.json();
      if (!res.ok || !("token" in data) || !("url" in data)) {
        const msg = "error" in data ? data.error : `HTTP_${res.status}`;
        throw new Error(msg);
      }
      const dataUrl = await QRCode.toDataURL(String(data.url), {
        errorCorrectionLevel: "M",
        margin: 2,
        scale: 6,
      });
      setState({ status: "done", token: data.token, url: data.url, dataUrl });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Unbekannter Fehler";
      setState({ status: "error", message });
      console.error("[QR] generate failed", err);
    }
  }
  const disabled = state.status === "working";

  return (
    <AppShellClientAdmin view={view} setView={setView}>
      {view === "qr" && (
        <main className="mx-auto max-w-2xl px-4 py-10">
          <h1 className="text-2xl font-semibold">QR-Code erzeugen</h1>
          <p className="mt-1 text-sm text-gray-500">
            Erzeuge einen einmaligen Claim-Link für ein Notizbuch.
          </p>

          <form
            className="mt-6 space-y-4"
            onSubmit={(e) => {
              e.preventDefault();
              void handleGenerate();
            }}
          >
            <label className="block text-sm font-medium">
              Notebook ID
              <input
                value={notebookId}
                onChange={(e) => setNotebookId(e.target.value)}
                placeholder="z. B. 68ea6812eab8b6ec146b0b8f"
                className="mt-1 w-full rounded-xl border px-3 py-2"
              />
            </label>

            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={handleGenerate}
                disabled={disabled}
                className={`rounded-xl px-4 py-2 text-white ${
                  disabled ? "bg-gray-400" : "bg-gray-900 hover:bg-black"
                }`}
              >
                {disabled ? "Erzeuge…" : "QR-Code generieren"}
              </button>
            </div>
          </form>

          {state.status === "done" && (
            <section className="mt-8 space-y-3">
              <div className="rounded-xl border p-4">
                <div className="text-sm">
                  <div className="mb-1">
                    <span className="font-medium">Token:</span>{" "}
                    <code className="break-all">{state.token}</code>
                  </div>
                  <div className="mb-3">
                    <span className="font-medium">URL:</span>{" "}
                    <a
                      href={state.url}
                      className="text-blue-600 underline break-all"
                      target="_blank"
                      rel="noreferrer"
                    >
                      {state.url}
                    </a>
                  </div>
                  {state.dataUrl && (
                    <div className="flex items-start gap-6">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={state.dataUrl}
                        alt="QR Code"
                        className="h-48 w-48 rounded-lg border bg-white"
                      />
                      <div className="space-y-2">
                        <a
                          href={state.dataUrl}
                          download={`qnotes-${notebookId}.png`}
                          className="inline-block rounded-xl bg-gray-900 px-3 py-2 text-white hover:bg-black"
                        >
                          PNG herunterladen
                        </a>
                        <p className="text-xs text-gray-500">
                          Scannen führt zu{" "}
                          <span className="font-mono">{state.url}</span>
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </section>
          )}

          {state.status === "error" && (
            <div className="mt-6 rounded-xl border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-700">
              {state.message}
            </div>
          )}
        </main>
      )}

      {view === "users" && <UsersSection />}

      {view === "books" && <BooksSection />}

      {view === "prompt" && <PromptSettingsSection />}
    </AppShellClientAdmin>
  );
}
