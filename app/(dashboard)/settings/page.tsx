"use client";

import { useEffect, useState, isValidElement, cloneElement } from "react";
import Link from "next/link";

/* ===================== Settings Page ===================== */

export default function SettingsPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <header className="mb-8">
        <h1 className="text-2xl font-semibold tracking-tight">Einstellungen</h1>
        <p className="mt-1 text-sm text-gray-500">
          Verwalte dein Profil, Account-Daten und Sicherheit.
        </p>
      </header>

      <div className="space-y-6">
        <AvatarCard />
        <ProfileCard />
        <AccountCard />
        <SecurityCard />
      </div>
    </div>
  );
}

/* ===================== Avatar ===================== */

function AvatarCard() {
  const [url, setUrl] = useState<string>("");
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");

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

  async function onFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setError("");
    const fd = new FormData();
    fd.append("file", file);
    try {
      setUploading(true);
      const res = await fetch("/api/settings/avatar", { method: "POST", body: fd });
      if (!res.ok) throw new Error(await res.text());
      const data: { url: string } = await res.json();

      setUrl(data.url);

      // Sidebar sofort aktualisieren (aktueller Tab)
      window.dispatchEvent(new CustomEvent("pb:avatar-updated", { detail: data.url }));
      // Optional: andere Tabs syncen
      try {
        const bc = new BroadcastChannel("pb");
        bc.postMessage({ type: "avatar-updated", url: data.url });
        bc.close();
      } catch {}
    } catch {
      setError("Upload fehlgeschlagen.");
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  }

  async function onRemove() {
    try {
      setUploading(true);
      const res = await fetch("/api/settings/avatar", { method: "DELETE" });
      if (!res.ok) throw new Error(await res.text());
      const data: { url: string } = await res.json();

      setUrl(data.url);
      window.dispatchEvent(new CustomEvent("pb:avatar-updated", { detail: data.url }));
      try {
        const bc = new BroadcastChannel("pb");
        bc.postMessage({ type: "avatar-updated", url: data.url });
        bc.close();
      } catch {}
    } catch {
      setError("Zurücksetzen fehlgeschlagen.");
    } finally {
      setUploading(false);
    }
  }

  return (
    <Card>
      <CardHeader title="Profilbild" description="Dieses Bild wird in der App angezeigt." />
      <div className="flex items-center gap-4 sm:items-start sm:gap-5">
        <div className="size-16 overflow-hidden rounded-full border border-gray-200 bg-gray-100 shrink-0">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={url || "/images/avatar-fallback.png"}
            alt="Avatar"
            className="size-full object-cover"
            onError={(e) => { (e.currentTarget.src = "/images/avatar-fallback.png"); }}
          />
        </div>

        {/* Mobile: untereinander & linksbündig; ab sm: nebeneinander */}
        <div className="flex w-full flex-col items-start gap-2 sm:flex-row sm:items-center sm:gap-3">
          <label className="inline-flex cursor-pointer items-center justify-center rounded-2xl border border-gray-900 bg-gray-900 px-3.5 py-2 text-sm font-medium text-white hover:bg-black">
            <input type="file" accept="image/*" className="hidden" onChange={onFileChange} disabled={uploading} />
            {uploading ? "Lade hoch…" : "Neues Bild wählen"}
          </label>
          <Button type="button" onClick={onRemove} disabled={uploading} className="rounded-2xl">
            Auf Standard zurücksetzen
          </Button>
          {error ? <MutedHint>{error}</MutedHint> : null}
        </div>
      </div>
    </Card>
  );
}

/* ===================== Profile ===================== */

function ProfileCard() {
  const [firstName, setFirstName] = useState<string>("");
  const [lastName, setLastName] = useState<string>("");

  const [loading, setLoading] = useState<boolean>(false);
  const [saving, setSaving] = useState<boolean>(false);
  const [saved, setSaved] = useState<boolean>(false);
  const [error, setError] = useState<string>("");

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        setLoading(true);
        setError("");
        const res = await fetch("/api/settings/profile", { method: "GET" });
        if (!res.ok) throw new Error(await res.text());
        const data: { firstName?: string; lastName?: string } = await res.json();
        if (!alive) return;
        setFirstName(data.firstName ?? "");
        setLastName(data.lastName ?? "");
      } catch {
        setError("Profil konnte nicht geladen werden.");
      } finally {
        setLoading(false);
      }
    })();
    return () => { alive = false; };
  }, []);

  async function onSave(e: React.FormEvent) {
    e.preventDefault();
    try {
      setSaving(true);
      setSaved(false);
      setError("");
      const res = await fetch("/api/settings/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ firstName: firstName.trim(), lastName: lastName.trim() }),
      });
      if (!res.ok) throw new Error(await res.text());
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } catch {
      setError("Speichern fehlgeschlagen.");
    } finally {
      setSaving(false);
    }
  }

  const canSave = !loading && !saving && (firstName.trim().length > 0 || lastName.trim().length > 0);

  return (
    <Card>
      <CardHeader
        title="Profil"
        description="Dein Name erscheint in Powerbooks, Kommentaren und E-Mails."
      />
      <form onSubmit={onSave} className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field label="Vorname">
          <Input
            placeholder="Max"
            value={firstName}
            onChange={(e) => setFirstName(e.target.value)}
            disabled={loading || saving}
          />
        </Field>
        <Field label="Nachname">
          <Input
            placeholder="Mustermann"
            value={lastName}
            onChange={(e) => setLastName(e.target.value)}
            disabled={loading || saving}
          />
        </Field>

        <div className="sm:col-span-2 flex items-center gap-3 pt-2">
          <Button type="submit" disabled={!canSave}>
            {saving ? "Speichere…" : "Änderungen speichern"}
          </Button>
          {saved ? <span className="text-xs text-emerald-600">Gespeichert.</span> : null}
          {error ? <span className="text-xs text-red-600">{error}</span> : null}
        </div>
      </form>
    </Card>
  );
}

/* ===================== Account ===================== */

function AccountCard() {
  const [email, setEmail] = useState<string>("");

  const [loading, setLoading] = useState<boolean>(false);
  const [saving, setSaving] = useState<boolean>(false);
  const [saved, setSaved] = useState<boolean>(false);
  const [error, setError] = useState<string>("");

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        setLoading(true);
        setError("");
        const res = await fetch("/api/settings/account", { method: "GET" });
        if (!res.ok) throw new Error(await res.text());
        const data: { email?: string } = await res.json();
        if (!alive) return;
        setEmail(data.email ?? "");
      } catch {
        setError("Account-Daten konnten nicht geladen werden.");
      } finally {
        setLoading(false);
      }
    })();
    return () => { alive = false; };
  }, []);

  function isValidEmail(val: string) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val);
  }

  async function onSave(e: React.FormEvent) {
    e.preventDefault();
    try {
      setSaving(true);
      setSaved(false);
      setError("");

      const val = email.trim();
      if (!isValidEmail(val)) {
        setError("Bitte eine gültige E-Mail eingeben.");
        setSaving(false);
        return;
      }

      const res = await fetch("/api/settings/account", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: val }),
      });
      if (!res.ok) {
        const text = await res.text();
        throw new Error(text || "Update fehlgeschlagen");
      }

      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } catch {
      setError("Speichern fehlgeschlagen (E-Mail eventuell bereits vergeben?).");
    } finally {
      setSaving(false);
    }
  }

  const canSave = !loading && !saving && isValidEmail(email.trim());

  return (
    <Card>
      <CardHeader
        title="Account"
        description="Diese E-Mail nutzen wir für Login und Benachrichtigungen."
      />
      <form onSubmit={onSave} className="space-y-4">
        <Field label="E-Mail">
          <Input
            type="email"
            placeholder="dein.name@beispiel.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            disabled={loading || saving}
          />
        </Field>

        <div className="flex items-center gap-3 pt-2">
          <Button type="submit" disabled={!canSave}>
            {saving ? "Speichere…" : "Änderungen speichern"}
          </Button>
          {saved ? <span className="text-xs text-emerald-600">Gespeichert.</span> : null}
          <span className="text-xs text-red-600">{error}</span>
        </div>
      </form>
    </Card>
  );
}

/* ===================== Security ===================== */

function SecurityCard() {
  return (
    <Card>
      <CardHeader
        title="Sicherheit"
        description="Verwalte dein Passwort und weitere Sicherheitsoptionen."
      />
      <div className="flex flex-col gap-4">
        <div className="flex items-start justify-between gap-6">
          <div>
            <div className="font-medium">Passwort</div>
            <p className="text-sm text-gray-500">
              Wir speichern Passwörter nie im Klartext.
            </p>
          </div>
          <Link
            href="/forgot-password"
            className="inline-flex items-center justify-center rounded-xl border border-gray-200 px-3 py-1.5 text-sm hover:bg-gray-50"
          >
            Passwort zurücksetzen
          </Link>
        </div>

        <div className="rounded-xl border border-dashed border-gray-300 p-4">
          <div className="mb-1 font-medium">2-Faktor-Authentifizierung</div>
          <p className="text-sm text-gray-500">
            Optional. Erhöht die Sicherheit beim Login. (UI-Placeholder)
          </p>
          <div className="mt-3">
            <Button disabled>Einrichtung starten</Button>
          </div>
        </div>
      </div>
    </Card>
  );
}

/* ===================== UI Primitives ===================== */

function Card({ children }: { children: React.ReactNode }) {
  return (
    <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
      {children}
    </section>
  );
}

function CardHeader({ title, description }: { title: string; description?: string }) {
  return (
    <div className="mb-5">
      <h2 className="text-base font-semibold">{title}</h2>
      {description ? <p className="mt-1 text-sm text-gray-500">{description}</p> : null}
    </div>
  );
}

function Field({
  label,
  children,
  hint,
}: {
  label: string;
  children: React.ReactNode;
  hint?: string;
}) {
  const id = makeId(label);
  return (
    <label htmlFor={id} className="block">
      <div className="mb-1.5 text-sm font-medium text-gray-700">{label}</div>
      {cloneWithId(children, id)}
      {hint ? <p className="mt-1 text-xs text-gray-500">{hint}</p> : null}
    </label>
  );
}

function Input(
  props: React.DetailedHTMLProps<React.InputHTMLAttributes<HTMLInputElement>, HTMLInputElement>
) {
  return (
    <input
      {...props}
      className={`w-full rounded-xl border border-gray-300 bg-white px-3 py-2 text-sm outline-none ring-offset-2 placeholder:text-gray-400 focus:border-gray-400 focus:ring-2 focus:ring-gray-900/10 ${props.className ?? ""}`}
    />
  );
}

function Button(
  props: React.DetailedHTMLProps<React.ButtonHTMLAttributes<HTMLButtonElement>, HTMLButtonElement>
) {
  const { className, disabled, ...rest } = props;
  return (
    <button
      {...rest}
      disabled={disabled}
      className={`inline-flex items-center justify-center rounded-xl px-3 py-1.5 text-sm font-medium transition-colors
      ${
        disabled
          ? "cursor-not-allowed border border-gray-200 bg-gray-50 text-gray-400"
          : "border border-gray-900 bg-gray-900 text-white hover:bg-black"
      }
      ${className ?? ""}`}
    />
  );
}

function MutedHint({ children }: { children: React.ReactNode }) {
  return <span className="text-xs text-gray-400">{children}</span>;
}

/* ===================== tiny utils ===================== */

function makeId(label: string) {
  return label.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "");
}

type WithIdName = { id?: string; name?: string };

function cloneWithId(node: React.ReactNode, id: string): React.ReactNode {
  if (!isValidElement<WithIdName>(node)) return node;
  return cloneElement(node, { id, name: id });
}
