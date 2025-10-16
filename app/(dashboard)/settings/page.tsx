"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { isValidElement, cloneElement } from "react";

export default function SettingsPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <header className="mb-8">
        <h1 className="text-2xl font-semibold tracking-tight">Einstellungen</h1>
        <p className="text-sm text-gray-500 mt-1">
          Verwalte dein Profil, Account-Daten und Sicherheit.
        </p>
      </header>

      <div className="space-y-6">
        <ProfileCard />
        <AccountCard />
        <SecurityCard />
      </div>
    </div>
  );
}

/* ———————————— Profile ———————————— */

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
    return () => {
      alive = false;
    };
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
        description="Dein Name erscheint in Notizbüchern, Kommentaren und E-Mails."
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

/* ———————————— Account ———————————— */

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
    return () => {
      alive = false;
    };
  }, []);

  function isValidEmail(val: string) {
    // simple RFC5322-ish
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
    } catch (e) {
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

/* ———————————— Security ———————————— */

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
          <div className="font-medium mb-1">2-Faktor-Authentifizierung</div>
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

/* ———————————— UI Primitives (Tailwind-only) ———————————— */

function Card({ children }: { children: React.ReactNode }) {
  return (
    <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
      {children}
    </section>
  );
}

function CardHeader({
  title,
  description,
}: {
  title: string;
  description?: string;
}) {
  return (
    <div className="mb-5">
      <h2 className="text-base font-semibold">{title}</h2>
      {description ? (
        <p className="text-sm text-gray-500 mt-1">{description}</p>
      ) : null}
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
  props: React.DetailedHTMLProps<
    React.InputHTMLAttributes<HTMLInputElement>,
    HTMLInputElement
  >
) {
  return (
    <input
      {...props}
      className={`w-full rounded-xl border border-gray-300 bg-white px-3 py-2 text-sm outline-none ring-offset-2 placeholder:text-gray-400 focus:border-gray-400 focus:ring-2 focus:ring-gray-900/10 ${props.className ?? ""}`}
    />
  );
}

function Button(
  props: React.DetailedHTMLProps<
    React.ButtonHTMLAttributes<HTMLButtonElement>,
    HTMLButtonElement
  >
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

/* ———————————— tiny utils ———————————— */
function makeId(label: string) {
  return label.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "");
}

// Props-Shape, das id/name erlaubt
type WithIdName = { id?: string; name?: string };

// sauber getypte Variante ohne `any`
function cloneWithId(node: React.ReactNode, id: string): React.ReactNode {
  if (!isValidElement<WithIdName>(node)) return node;
  return cloneElement(node, { id, name: id });
}
