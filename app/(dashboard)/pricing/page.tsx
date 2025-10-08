// app/(dashboard)/pricing/page.tsx
"use client";

import { useState } from "react";
import { CheckIcon } from "@heroicons/react/24/solid";

type Plan = {
  id: "starter" | "pro" | "team";
  name: string;
  monthly: number;
  yearly: number;
  highlight?: boolean;
  features: string[];
  cta: string;
};

const PLANS: Plan[] = [
  {
    id: "starter",
    name: "Starter",
    monthly: 5,
    yearly: 50,
    features: ["1 Notizbuch", "200 Seiten", "Basis-Export (PDF)", "E-Mail Support"],
    cta: "Upgrade",
  },
  {
    id: "pro",
    name: "Pro",
    monthly: 12,
    yearly: 120,
    highlight: true,
    features: ["3 Notizbücher", "1.000 Seiten", "PDF & PNG Export", "Prioritätssupport"],
    cta: "Upgrade",
  },
  {
    id: "team",
    name: "Team",
    monthly: 25,
    yearly: 250,
    features: ["5+ Notizbücher", "Freigaben & Rollen", "Sammel-Export", "Support für Teams"],
    cta: "Kontakt",
  },
];

export default function PricingPage() {
  const [billing, setBilling] = useState<"monthly" | "yearly">("monthly");
  const currentPlan = "Starter"; // <- später aus Backend

  return (
    <div className="mx-auto max-w-6xl">
      <header className="mb-8">
        <h1 className="text-2xl font-semibold tracking-tight">Preise & Pläne</h1>
        <p className="mt-1 text-sm text-gray-500">
          Wähle den Plan, der zu deinem Workflow passt. Du kannst jederzeit wechseln.
        </p>

        {/* Billing Toggle */}
        <div className="mt-4 inline-flex items-center gap-2 rounded-full border border-gray-200 p-1">
          <button
            onClick={() => setBilling("monthly")}
            className={`rounded-full px-3 py-1.5 text-sm ${
              billing === "monthly" ? "bg-gray-900 text-white" : "text-gray-600 hover:bg-gray-100"
            }`}
          >
            Monatlich
          </button>
          <button
            onClick={() => setBilling("yearly")}
            className={`rounded-full px-3 py-1.5 text-sm ${
              billing === "yearly" ? "bg-gray-900 text-white" : "text-gray-600 hover:bg-gray-100"
            }`}
          >
            Jährlich <span className="ml-1 text-xs text-gray-400">({billing === "yearly" ? "–" : "bis zu "}2 Monate gratis)</span>
          </button>
        </div>
      </header>

      {/* Cards */}
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {PLANS.map((plan) => {
          const price = billing === "monthly" ? plan.monthly : plan.yearly;
          const period = billing === "monthly" ? " / Monat" : " / Jahr";
          const isCurrent = currentPlan.toLowerCase() === plan.name.toLowerCase();

          return (
            <div
              key={plan.id}
              className={`relative rounded-2xl border bg-white p-6 shadow-sm ${
                plan.highlight ? "border-gray-900" : "border-gray-200"
              }`}
            >
              {plan.highlight && (
                <div className="absolute -top-3 left-6 rounded-full bg-gray-900 px-2 py-0.5 text-xs font-medium text-white">
                  Beliebt
                </div>
              )}

              <h3 className="text-lg font-semibold">{plan.name}</h3>
              <div className="mt-2 flex items-baseline gap-1">
                <span className="text-3xl font-bold">{price}€</span>
                <span className="text-sm text-gray-500">{period}</span>
              </div>

              <ul className="mt-4 space-y-2">
                {plan.features.map((f) => (
                  <li key={f} className="flex items-start gap-2 text-sm text-gray-700">
                    <CheckIcon className="mt-0.5 h-4 w-4 flex-none text-gray-900" />
                    <span>{f}</span>
                  </li>
                ))}
              </ul>

              <div className="mt-6">
                {isCurrent ? (
                  <button
                    className="w-full cursor-default rounded-xl border border-gray-200 px-4 py-2 text-sm font-medium text-gray-600"
                    disabled
                    aria-disabled
                  >
                    Aktueller Plan
                  </button>
                ) : (
                  <button
                    className={`w-full rounded-xl px-4 py-2 text-sm font-medium ${
                      plan.highlight
                        ? "bg-gray-900 text-white hover:bg-black"
                        : "border border-gray-300 text-gray-900 hover:bg-gray-50"
                    }`}
                    onClick={() => {
                      // später Stripe/Checkout öffnen
                    }}
                  >
                    {plan.cta}
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* FAQ (kurz) */}
      <div className="mt-10 rounded-2xl border border-gray-200 p-6">
        <h4 className="text-base font-semibold">Häufige Fragen</h4>
        <dl className="mt-4 grid gap-4 sm:grid-cols-2">
          <div>
            <dt className="text-sm font-medium text-gray-900">Kann ich jederzeit wechseln?</dt>
            <dd className="mt-1 text-sm text-gray-600">Ja, Up- oder Downgrade ist jederzeit möglich.</dd>
          </div>
          <div>
            <dt className="text-sm font-medium text-gray-900">Gibt es eine Rückerstattung?</dt>
            <dd className="mt-1 text-sm text-gray-600">Nicht anteilig, aber der Wechsel gilt sofort fürs nächste Intervall.</dd>
          </div>
        </dl>
      </div>
    </div>
  );
}
