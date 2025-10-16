// app/(dashboard)/settings/page.tsx
"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { isValidElement, cloneElement } from "react";

export default function SettingsPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <header className="mb-8">
        <h1 className="text-2xl font-semibold tracking-tight">Integrationen</h1>
        <p className="text-sm text-gray-500 mt-1">
          Verwalte deine Integrationen und jeweiligen Zugangsdaten
        </p>
      </header>

      <div className="space-y-6">
        <NexoroCard />
        <DarleanCard />
      </div>
    </div>
  );
}

/* ———————————— Profile ———————————— */

function NexoroCard() {
  const [nexoroUser, setNexoroUser] = useState<string>("");
  const [nexoroDomain, setNexoroDomain] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(false);
  const [saving, setSaving] = useState<boolean>(false);
  const [saved, setSaved] = useState<boolean>(false);
  const [error, setError] = useState<string>("");

  // Vorhandene Werte beim Laden holen
  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        setLoading(true);
        setError("");
        const res = await fetch("/api/settings/nexoro", { method: "GET" });
        if (!res.ok) throw new Error(await res.text());
        const data: { nexoroUser?: string; nexoroDomain?: string } = await res.json();
        if (!alive) return;
        setNexoroUser(data.nexoroUser ?? "");
        setNexoroDomain(data.nexoroDomain ?? "");
      } catch (e) {
        setError("Konnte Nexoro-Daten nicht laden.");
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

      const body = {
        nexoroUser: (nexoroUser || "").trim(),
        nexoroDomain: (nexoroDomain || "").trim(),
      };

      const res = await fetch("/api/settings/nexoro", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error(await res.text());

      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } catch (e) {
      setError("Speichern fehlgeschlagen.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Card>
      <CardHeader
        title="Nexoro CRM"
        description="Integriere deine Notebooks vollautomatisch zu Nexoro CRM"
        logoUrl="/images/logos/nexoro.svg"
        logoAlt="Powerbook Logo"
      />
      <form onSubmit={onSave} className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field label="Nexoro - Benutzername">
          <Input
            placeholder="Max"
            value={nexoroUser}
            onChange={(e) => setNexoroUser(e.target.value)}
            disabled={loading || saving}
          />
        </Field>
        <Field label="Nexoro - Domain">
          <Input
            placeholder="example.nexoro.net"
            value={nexoroDomain}
            onChange={(e) => setNexoroDomain(e.target.value)}
            disabled={loading || saving}
          />
        </Field>

        <div className="sm:col-span-2 flex flex-col items-center gap-2 pt-2">
          {error ? <span className="text-sm text-red-600">{error}</span> : null}
          {saved ? (
            <span className="text-sm text-emerald-600">Erfolgreich gespeichert.</span>
          ) : null}

          <Button
            type="submit"
            className="hover:opacity-90 cursor-pointer"
            disabled={
              loading ||
              saving ||
              !(nexoroDomain.trim().length && nexoroUser.trim().length)
            }
          >
            {saving ? "Speichere…" : "Änderungen speichern"}
          </Button>
          <MutedHint>
            Mit dem Speichern Ihrer Daten stimmen Sie dem Datenaustausch zwischen
            Powerbook und Nexoro automatisch zu.
          </MutedHint>
        </div>
      </form>
    </Card>
  );
}

function DarleanCard() {
  const [darleanUser, setDarleanUser] = useState<string>("");
  const [darleanDomain, setDarleanDomain] = useState<string>("");

  return (
    <Card>
      <CardHeader
        title="Darlean CRM"
        description="Integriere deine Notebooks vollautomatisch zu Darlean CRM"
        logoUrl="/images/logos/darlean.svg"
        logoAlt="Darlean Logo"
      />
      <form
        onSubmit={(e) => e.preventDefault()}
        className="grid grid-cols-1 gap-4 sm:grid-cols-2"
      >
        <Field label="Darlean - Benutzername">
          <Input
            placeholder="Max"
            value={darleanUser}
            onChange={(e) => setDarleanUser(e.target.value)}
          />
        </Field>
        <Field label="Darlean - Domain">
          <Input
            placeholder="example.darlean.eu"
            value={darleanDomain}
            onChange={(e) => setDarleanDomain(e.target.value)}
          />
        </Field>

        <div className="sm:col-span-2 flex flex-col items-center gap-3 pt-2">
          <Button type="submit" className="hover:opacity-90 cursor-pointer" disabled={!darleanDomain || !darleanUser}>
            Änderungen speichern
          </Button>
          <MutedHint>
            Mit dem Speichern Ihrer Daten stimmen Sie dem Datenaustausch zwischen Powerbook und Darlean automatisch zu.
          </MutedHint>
        </div>
      </form>
    </Card>
  );
}

/* ———————————— UI Primitives (Tailwind-only) ———————————— */

function Card({ children }: { children: React.ReactNode }) {
  return (
    <section className="relative rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
      {children}
    </section>
  );
}

function CardHeader({
  title,
  description,
  logoUrl,
  logoAlt = "Logo",
}: {
  title: string;
  description?: string;
  logoUrl?: string;
  logoAlt?: string;
}) {
  return (
    <div className="mb-5">
      {/* Logo oben rechts */}
      {logoUrl ? (
        <img
          src={logoUrl}
          alt={logoAlt}
          className="absolute right-4 top-4 h-13 w-auto opacity-80"
          loading="lazy"
        />
      ) : null}

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
