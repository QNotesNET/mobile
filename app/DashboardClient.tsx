"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import type { LucideIcon } from "lucide-react";
import { Camera, Clock, FileText, ChevronRight, Settings, BookOpenIcon, Check } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

// --- NEW: Task type for upcoming list
type TaskRow = {
  _id: string;
  title: string;
  note?: string;
  completed: boolean;
  dueAt?: string | null;
  listId: string;
};

type NotebookCard = {
  id: string;
  title: string;
  pages: number;        // gescannt
  totalPages: number;   // Soll
  lastUpdated: string;
  completion: number;   // %
  color: string;
};

type Props = {
  userName: string;
  userEmail: string;
  notebookCount: number;
  pagesTotal: number; // ← neu: alle gescannten Seiten
  notebooks: NotebookCard[];
  userId: string; // <– ID des aktuellen Benutzers
};

export default function DashboardClient({
  userName,
  userEmail,
  notebookCount,
  pagesTotal,
  notebooks,
  userId
}: Props) {
  const initials = useMemo(
    () => userName.slice(0, 2).toUpperCase(),
    [userName]
  );

  // ---------- NEW: Upcoming tasks (next 3) ----------
  const [upcoming, setUpcoming] = useState<TaskRow[] | null>(null);
  const [loadingUpcoming, setLoadingUpcoming] = useState<boolean>(true);

  useEffect(() => {
    let alive = true;
    async function load() {
      setLoadingUpcoming(true);
      try {
        const res = await fetch(
          `/api/tasks?userId=${encodeURIComponent(
            userId
          )}&completed=false&limit=50`,
          { cache: "no-store" }
        );
        const data = await res.json();
        const items: TaskRow[] = Array.isArray(data?.items) ? data.items : [];

        const sorted = items
          .slice()
          .sort((a, b) => {
            const da = a.dueAt
              ? new Date(a.dueAt).getTime()
              : Number.POSITIVE_INFINITY;
            const db = b.dueAt
              ? new Date(b.dueAt).getTime()
              : Number.POSITIVE_INFINITY;
            return da - db;
          })
          .slice(0, 3);

        if (alive) setUpcoming(sorted);
      } catch {
        if (alive) setUpcoming([]);
      } finally {
        if (alive) setLoadingUpcoming(false);
      }
    }
    load();
    return () => {
      alive = false;
    };
  }, [userId]); // <– Effekt abhängiger von userId

  function formatDue(dueAt?: string | null) {
    if (!dueAt) return "ohne Termin";
    const d = new Date(dueAt);
    const now = new Date();
    const isSameDay =
      d.getFullYear() === now.getFullYear() &&
      d.getMonth() === now.getMonth() &&
      d.getDate() === now.getDate();
    const tomorrow = new Date(now);
    tomorrow.setDate(now.getDate() + 1);
    const isTomorrow =
      d.getFullYear() === tomorrow.getFullYear() &&
      d.getMonth() === tomorrow.getMonth() &&
      d.getDate() === tomorrow.getDate();

    const pad = (n: number) => String(n).padStart(2, "0");
    const hm = `${pad(d.getHours())}:${pad(d.getMinutes())}`;
    if (isSameDay) return `Heute, ${hm}`;
    if (isTomorrow) return `Morgen, ${hm}`;
    // wenn Uhrzeit auf 00:00 -> nur Datum
    const onlyDate = d.getHours() === 0 && d.getMinutes() === 0;
    const dateStr = `${pad(d.getDate())}.${pad(d.getMonth() + 1)}.`;
    return onlyDate ? dateStr : `${dateStr} ${hm}`;
  }

  return (
    <TooltipProvider>
      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 md:py-8">
        {/* Header */}
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">
              Willkommen, {userName}
            </h1>
            <p className="text-muted-foreground">Eingeloggt als {userEmail}</p>
          </div>
          <div className="flex w-full items-center gap-2 md:w-auto">
            <Input placeholder="Suchen… (⌘K)" className="md:w-80" />
            <Button asChild>{/* leer */}</Button>
          </div>
        </div>

        {/* Top Row */}
        <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <MetricCard
            icon={BookOpenIcon}
            title="Powerbooks"
            value={String(notebookCount)}
            link="/notebooks"
          />
          <MetricCard
            icon={FileText}
            title="Erfasste Seiten"
            value={String(pagesTotal)}
            link="/notebooks"
          />
          <ActionCard
            icon={Camera}
            title="Seite scannen"
            href="/scan"
            hint="Schnell starten"
          />
          <ActionCard
            icon={Clock}
            title="Zuletzt bearbeitet"
            href="/notebooks?sort=recent"
            hint="Schnell starten"
          />
        </div>

        {/* Main Grid */}
        <div className="mt-6 grid gap-6 lg:grid-cols-3">
          {/* Notebooks (ECHT) */}
          <Card className="lg:col-span-2 mx-auto w-full max-w-[380px] sm:max-w-[560px] lg:max-w-none">
            <CardHeader className="flex items-start justify-between pb-3">
              <div>
                <CardTitle>Deine Powerbooks</CardTitle>
                <CardDescription>
                  Kurzer Überblick & schnelle Aktionen
                </CardDescription>
              </div>
              <Button variant="ghost" asChild>
                <Link href="/notebooks">
                  Alle ansehen <ChevronRight className="ml-1 h-4 w-4" />
                </Link>
              </Button>
            </CardHeader>
            <CardContent>
              {notebooks.length === 0 ? (
                <div className="rounded-xl border p-6 text-sm text-muted-foreground">
                  Noch keine Powerbooks. Bestelle jetzt dein Powerbook!
                </div>
              ) : (
                <div className="grid gap-4 sm:grid-cols-2">
                  {notebooks.map((nb) => (
                    <div key={nb.id} className="rounded-2xl border p-4">
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-3">
                          <div className={`h-8 w-8 rounded-lg ${nb.color}`} />
                          <div>
                            <Link
                              href={`/notebooks/${nb.id}`}
                              className="font-medium hover:underline"
                            >
                              {nb.title}
                            </Link>
                            <div className="text-xs text-muted-foreground">
                              {nb.pages} Seiten • {nb.lastUpdated}
                            </div>
                          </div>
                        </div>
                        {/* <Tooltip>
                          <TooltipTrigger asChild>
                            <Button size="icon" variant="ghost" className="h-8 w-8" asChild>
                              <Link href={`/notebooks/${nb.id}/settings`} aria-label="Powerbook-Einstellungen">
                                <Settings className="h-4 w-4" />
                              </Link>
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>Powerbook-Einstellungen</TooltipContent>
                        </Tooltip> */}
                      </div>

                      <div className="mt-4">
                        <Progress value={nb.completion} />
                        <div className="mt-1 flex items-center justify-between text-xs text-muted-foreground">
                          <span>Fortschritt</span>
                          <span>{nb.completion}%</span>
                        </div>
                        <div className="mt-1 text-[11px] text-muted-foreground">
                          {nb.pages}/{nb.totalPages} Seiten gescannt
                        </div>
                      </div>

                      <div className="mt-4 flex items-center gap-2">
                        <Button asChild size="sm">
                          <Link href={`/notebooks/${nb.id}`}>Öffnen</Link>
                        </Button>
                        {/* <Button asChild size="sm" variant="secondary">
                          <Link href={`/notebooks/${nb.id}/share`}>Teilen</Link>
                        </Button> */}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Rechte Spalte: ANSTEHENDE AUFGABEN (neu) */}
          <Card className="mx-auto w-full max-w-[380px] sm:max-w-[560px] lg:max-w-none">
            <CardHeader className="pb-3">
              <CardTitle>Anstehende Aufgaben</CardTitle>
              <CardDescription>
                Die nächsten drei offenen Aufgaben
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {loadingUpcoming ? (
                <>
                  <div className="h-14 w-full animate-pulse rounded-xl bg-muted/60" />
                  <div className="h-14 w-full animate-pulse rounded-xl bg-muted/60" />
                  <div className="h-14 w-full animate-pulse rounded-xl bg-muted/60" />
                </>
              ) : !upcoming || upcoming.length === 0 ? (
                <div className="rounded-xl border p-3 text-sm text-muted-foreground">
                  Aktuell stehen keine offenen Aufgaben an.
                </div>
              ) : (
                upcoming.map((t) => (
                  <Link
                    key={t._id}
                    href={`/tasks`} // ggf. deeplink anpassen, falls du eine Detail-Route hast
                    className="group flex items-center gap-3 rounded-xl border p-3 hover:bg-accent"
                  >
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg border bg-background">
                      <Check className="h-5 w-5 text-muted-foreground" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="truncate font-medium">
                        {t.title || "Aufgabe"}
                      </div>
                      <div className="truncate text-xs text-muted-foreground">
                        Fällig: {formatDue(t.dueAt)}
                      </div>
                    </div>
                    <ChevronRight className="h-4 w-4 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
                  </Link>
                ))
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </TooltipProvider>
  );
}

/* ——— kompaktere, größere Cards ——— */
function MetricCard({ icon: Icon, title, value, link }: { icon: LucideIcon; title: string; value: string, link: string }) {
  return (
    <Card className="shadow-sm">
      <Link href={link}>
        <CardContent className="flex flex-col items-center justify-center gap-2 p-4 text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl border">
            <Icon className="h-6 w-6 text-muted-foreground" />
          </div>
          <div className="text-base text-muted-foreground">{title}</div>
          <div className="text-3xl font-bold leading-tight">{value}</div>
        </CardContent>
      </Link>
    </Card>
  );
}

function ActionCard({
  icon: Icon,
  title,
  href,
  hint = "Schnell starten",
}: {
  icon: LucideIcon;
  title: string;
  href: string;
  hint?: string;
}) {
  return (
    <Card className="shadow-sm ">
      <CardContent className="flex flex-col items-center justify-center gap-2 p-4 text-center">
        <div className="flex h-12 w-12 items-center justify-center rounded-xl border">
          <Icon className="h-6 w-6 text-muted-foreground" />
        </div>
        <div className="text-base font-medium">{title}</div>
        <CardDescription className="text-xs">{hint}</CardDescription>
        <Button asChild size="sm" variant="secondary" className="mt-1">
          <Link href={href}>Öffnen</Link>
        </Button>
      </CardContent>
    </Card>
  );
}
