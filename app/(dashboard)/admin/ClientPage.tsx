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
} from "@heroicons/react/24/outline";

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

function cx(...c: Array<string | false | null | undefined>) {
  return c.filter(Boolean).join(" ");
}
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
      const data = (await res.json()) as UserRow[];
      setUsers(Array.isArray(data) ? data : []);
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
    } catch (e) {
      alert("Speichern fehlgeschlagen.");
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
      const res = await fetch(`/api/users/${delTarget._id}`, { method: "DELETE" });
      if (!res.ok) throw new Error(`HTTP_${res.status}`);
      setDelOpen(false);
      setDelTarget(null);
      await loadUsers();
    } catch (e) {
      alert("Löschen fehlgeschlagen.");
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

        {/* <button
          type="button"
          className="inline-flex items-center justify-center rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm font-medium hover:bg-gray-50"
        >
          + User erstellen
        </button> */}
      </div>

      {/* Controls */}
      <div className="mb-5 grid gap-3 sm:grid-cols-3">
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Suchen (Name, Benutzername, E-Mail)…"
          className="w-full rounded-xl border border-gray-300 bg-white px-3 py-2 text-sm placeholder:text-gray-400 focus:border-gray-400 focus:ring-2 focus:ring-gray-900/10"
        />

        {/* hübscher Role-Dropdown */}
        <Listbox value={roleFilter} onChange={(v: "" | "admin" | "user") => setRoleFilter(v)}>
          <div className="relative">
            <Listbox.Button className="relative w-full rounded-xl border border-gray-300 bg-white px-3 py-2 pr-8 text-left text-sm focus:border-gray-400 focus:ring-2 focus:ring-gray-900/10">
              <span className="block truncate">
                {roleFilter === "" ? "Alle Rollen" : roleFilter === "admin" ? "Admin" : "User"}
              </span>
              <span className="pointer-events-none absolute inset-y-0 right-2 flex items-center">
                <ChevronUpDownIcon className="h-5 w-5 text-gray-400" />
              </span>
            </Listbox.Button>
            <Transition as={Fragment} leave="transition ease-in duration-100" leaveFrom="opacity-100" leaveTo="opacity-0">
              <Listbox.Options className="absolute z-20 mt-2 w-full rounded-xl bg-white py-1 text-sm shadow-lg ring-1 ring-black/5 focus:outline-none">
                <Listbox.Option value="">
                  {({ selected, active }) => (
                    <div className={cx("flex cursor-pointer items-center justify-between px-3 py-2", active && "bg-gray-50")}>
                      <span>Alle Rollen</span>
                      {selected ? <CheckIcon className="h-5 w-5 text-gray-600" /> : null}
                    </div>
                  )}
                </Listbox.Option>
                {roles.map((r) => (
                  <Listbox.Option key={r.id} value={r.id}>
                    {({ selected, active }) => (
                      <div className={cx("flex cursor-pointer items-center justify-between px-3 py-2", active && "bg-gray-50")}>
                        <span>{r.label}</span>
                        {selected ? <CheckIcon className="h-5 w-5 text-gray-600" /> : null}
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
        <div className="mb-4 rounded-xl border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-700">{err}</div>
      ) : null}

      {/* Loading */}
      {loading ? (
        <div className="space-y-2">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-12 w-full animate-pulse rounded-xl bg-gray-100" />
          ))}
        </div>
      ) : (
        <>
          {/* Desktop-Tabelle */}
          <div className="hidden overflow-hidden rounded-2xl border bg-white sm:block">
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
                    <td colSpan={6} className="px-4 py-6 text-center text-gray-500">
                      Keine Benutzer gefunden.
                    </td>
                  </tr>
                ) : (
                  filtered.map((u) => {
                    const name = [u.firstName, u.lastName].filter(Boolean).join(" ") || "—";
                    const uname = usernameFromEmail(u.email);
                    return (
                      <tr key={u._id} className="border-t">
                        <td className="truncate px-4 py-3">{name}</td>
                        <td className="truncate px-4 py-3 font-mono text-gray-700">{uname}</td>
                        <td className="truncate px-4 py-3">{u.email}</td>
                        <td className="px-4 py-3">
                          <span className={cx("inline-flex items-center rounded-full px-2 py-0.5 text-xs", roleBadgeClass(u.role))}>
                            {u.role ?? "user"}
                          </span>
                        </td>
                        <td className="px-4 py-3">{formatDate(u.createdAt)}</td>
                        <td className="px-4 py-3">
                          <Menu as="div" className="relative inline-block text-left">
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
                              <Menu.Items className="absolute right-0 z-20 mt-2 w-52 origin-top-right rounded-xl bg-white p-1 text-sm shadow-lg ring-1 ring-black/5 focus:outline-none">
                                <Menu.Item>
                                  {({ active }) => (
                                    <button
                                      className={cx(
                                        "flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left",
                                        active && "bg-gray-50"
                                      )}
                                      onClick={() => openEdit(u)}
                                    >
                                      <PencilSquareIcon className="h-4 w-4" /> Umbenennen/Rolle
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
                                      onClick={() => alert("Reset-E-Mail gesendet (Demo).")}
                                    >
                                      <EnvelopeOpenIcon className="h-4 w-4" /> Reset-E-Mail senden
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
              <div className="rounded-xl border bg-white p-4 text-sm text-gray-500">Keine Benutzer gefunden.</div>
            ) : (
              filtered.map((u) => {
                const name = [u.firstName, u.lastName].filter(Boolean).join(" ") || "—";
                const uname = usernameFromEmail(u.email);
                return (
                  <div key={u._id} className="rounded-xl border bg-white p-4">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="font-medium">{name}</div>
                        <div className="mt-1 grid gap-1 text-sm text-gray-600">
                          <div>
                            <span className="text-gray-500">Benutzername: </span>
                            <span className="font-mono text-gray-800">{uname}</span>
                          </div>
                          <div>
                            <span className="text-gray-500">E-Mail: </span>
                            <span>{u.email}</span>
                          </div>
                          <div>
                            <span className="text-gray-500">Rolle: </span>
                            <span className={cx("ml-1 rounded-full px-2 py-0.5 text-xs", roleBadgeClass(u.role))}>
                              {u.role ?? "user"}
                            </span>
                          </div>
                          <div>
                            <span className="text-gray-500">Registriert: </span>
                            <span>{formatDate(u.createdAt)}</span>
                          </div>
                        </div>
                      </div>

                      <Menu as="div" className="relative -mr-2 inline-block text-left">
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
                          <Menu.Items className="absolute right-0 z-20 mt-2 w-48 origin-top-right rounded-xl bg-white p-1 text-sm shadow-lg ring-1 ring-black/5 focus:outline-none">
                            <Menu.Item>
                              {({ active }) => (
                                <button className={cx("flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left", active && "bg-gray-50")} onClick={() => openEdit(u)}>
                                  <PencilSquareIcon className="h-4 w-4" /> Umbenennen/Rolle
                                </button>
                              )}
                            </Menu.Item>
                            <Menu.Item>
                              {({ active }) => (
                                <button className={cx("flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left", active && "bg-gray-50")} onClick={() => alert("Reset-E-Mail gesendet (Demo).")}>
                                  <EnvelopeOpenIcon className="h-4 w-4" /> Reset-E-Mail senden
                                </button>
                              )}
                            </Menu.Item>
                            <div className="my-1 h-px bg-gray-100" />
                            <Menu.Item>
                              {({ active }) => (
                                <button className={cx("flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-red-600", active && "bg-red-50")} onClick={() => openDelete(u)}>
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
              <Dialog.Title className="text-base font-semibold">Benutzer bearbeiten</Dialog.Title>
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
                <Listbox value={editRole} onChange={(v: "admin" | "user") => setEditRole(v)}>
                  <div className="relative">
                    <Listbox.Button className="relative w-full rounded-xl border border-gray-300 bg-white px-3 py-2 pr-8 text-left text-sm focus:border-gray-400 focus:ring-2 focus:ring-gray-900/10">
                      <span className="block truncate">{editRole === "admin" ? "Admin" : "User"}</span>
                      <span className="pointer-events-none absolute inset-y-0 right-2 flex items-center">
                        <ChevronUpDownIcon className="h-5 w-5 text-gray-400" />
                      </span>
                    </Listbox.Button>
                    <Transition as={Fragment} leave="transition ease-in duration-100" leaveFrom="opacity-100" leaveTo="opacity-0">
                      <Listbox.Options className="absolute z-20 mt-2 w-full rounded-xl bg-white py-1 text-sm shadow-lg ring-1 ring-black/5 focus:outline-none">
                        {["admin", "user"].map((r) => (
                          <Listbox.Option key={r} value={r as "admin" | "user"}>
                            {({ selected, active }) => (
                              <div className={cx("flex cursor-pointer items-center justify-between px-3 py-2", active && "bg-gray-50")}>
                                <span>{r === "admin" ? "Admin" : "User"}</span>
                                {selected ? <CheckIcon className="h-5 w-5 text-gray-600" /> : null}
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
                <button className="rounded px-3 py-1.5 hover:bg-gray-50" onClick={() => setEditOpen(false)} disabled={saving}>
                  Abbrechen
                </button>
                <button
                  className={cx("rounded bg-black px-3 py-1.5 text-white", saving && "opacity-60")}
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
              <Dialog.Title className="text-base font-semibold text-red-600">Benutzer löschen</Dialog.Title>
              <p className="mt-2 text-sm text-gray-600">
                Möchtest du{" "}
                <span className="font-medium">
                  {delTarget ? [delTarget.firstName, delTarget.lastName].filter(Boolean).join(" ") || delTarget.email : ""}
                </span>{" "}
                wirklich löschen? Diese Aktion kann nicht rückgängig gemacht werden.
              </p>
              <div className="mt-5 flex items-center justify-end gap-2">
                <button className="rounded px-3 py-1.5 hover:bg-gray-50" onClick={() => setDelOpen(false)} disabled={deleting}>
                  Abbrechen
                </button>
                <button
                  className={cx("rounded bg-red-600 px-3 py-1.5 text-white", deleting && "opacity-60")}
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

/* ======================= Admin Page Client (unverändert außer Imports) ======================= */
export default function AdminPageClient() {
  const [notebookId, setNotebookId] = useState("");
  const [state, setState] = useState<GenState>({ status: "idle" });
  const [view, setView] = useState<"qr" | "users" | "books" | "prompt">("qr");

  async function handleGenerate(e?: React.MouseEvent<HTMLButtonElement>) {
    e?.preventDefault();
    const id = notebookId.trim();
    if (!id) {
      setState({ status: "error", message: "Bitte eine Notebook ID eingeben." });
      return;
    }
    try {
      setState({ status: "working" });
      const res = await fetch(`/api/qr/single?notebookId=${encodeURIComponent(id)}`);
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
          <p className="mt-1 text-sm text-gray-500">Erzeuge einen einmaligen Claim-Link für ein Notizbuch.</p>

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
                className={`rounded-xl px-4 py-2 text-white ${disabled ? "bg-gray-400" : "bg-gray-900 hover:bg-black"}`}
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
                    <span className="font-medium">Token:</span> <code className="break-all">{state.token}</code>
                  </div>
                  <div className="mb-3">
                    <span className="font-medium">URL:</span>{" "}
                    <a href={state.url} className="text-blue-600 underline break-all" target="_blank" rel="noreferrer">
                      {state.url}
                    </a>
                  </div>
                  {state.dataUrl && (
                    <div className="flex items-start gap-6">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={state.dataUrl} alt="QR Code" className="h-48 w-48 rounded-lg border bg-white" />
                      <div className="space-y-2">
                        <a
                          href={state.dataUrl}
                          download={`qnotes-${notebookId}.png`}
                          className="inline-block rounded-xl bg-gray-900 px-3 py-2 text-white hover:bg-black"
                        >
                          PNG herunterladen
                        </a>
                        <p className="text-xs text-gray-500">
                          Scannen führt zu <span className="font-mono">{state.url}</span>
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </section>
          )}

          {state.status === "error" && (
            <div className="mt-6 rounded-xl border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-700">{state.message}</div>
          )}
        </main>
      )}

      {view === "users" && <UsersSection />}

      {view === "books" && <p className="px-4 py-10">Neues Powerbook erstellen und Kunden zuweisen, Seiten erstellen usw</p>}

      {view === "prompt" && <p className="px-4 py-10">prompt settings dings do</p>}
    </AppShellClientAdmin>
  );
}
