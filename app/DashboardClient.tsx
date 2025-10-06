"use client";

import Link from "next/link";
import { useMemo } from "react";
import type { LucideIcon } from "lucide-react";
import {
  Camera,
  Clock,
  FileText,
  ChevronRight,
  Settings,
  Plus,
  BookOpenIcon,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

type Props = { userName: string; userEmail: string };

export default function DashboardClient({ userName, userEmail }: Props) {
  // —— Dummy-Daten (2 Notizbücher)
  const stats = [
    { key: "notebooks", label: "Notizbücher", value: 2, icon: BookOpenIcon },
    { key: "pagesWeek", label: "Seiten (7T)", value: 36, icon: FileText },
  ];

  const notebooks = [
    {
      id: "nb_meeting",
      title: "Meeting Notizen",
      pages: 89,
      lastUpdated: "Heute, 14:22",
      completion: 68,
      color: "bg-indigo-500",
    },
    {
      id: "nb_hausbau",
      title: "Projekt Hausbau Buchner",
      pages: 42,
      lastUpdated: "Gestern",
      completion: 34,
      color: "bg-emerald-500",
    },
  ];

  const recent = [
    { id: "pg_1", title: "Protokoll: Sprint Planning", notebook: "Meeting Notizen", ts: "vor 10 Min" },
    { id: "pg_2", title: "Jour Fixe – Entscheidungen", notebook: "Meeting Notizen", ts: "vor 2 Std" },
    { id: "pg_3", title: "Baustelle: Fundament-Skizze", notebook: "Projekt Hausbau Buchner", ts: "Gestern" },
  ];

  const initials = useMemo(() => userName.slice(0, 2).toUpperCase(), [userName]);

  return (
    <TooltipProvider>
      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 md:py-8">
        {/* Header */}
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">Willkommen, {userName}</h1>
            <p className="text-muted-foreground">Eingeloggt als {userEmail}</p>
          </div>
          <div className="flex w-full items-center gap-2 md:w-auto">
            <Input placeholder="Suchen… (⌘K)" className="md:w-80" />
            <Button asChild>
              <Link href="/notebooks/new" aria-label="Neues Notizbuch anlegen">
                <Plus className="mr-2 h-4 w-4" />
                Neues Notizbuch
              </Link>
            </Button>
          </div>
        </div>

        {/* Top Row: 4 Karten in einer Zeile */}
        <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <MetricCard
            icon={BookOpenIcon}
            title="Notizbücher"
            value={String(stats.find((s) => s.key === "notebooks")?.value ?? 0)}
          />
          <MetricCard
            icon={FileText}
            title="Seiten (7T)"
            value={String(stats.find((s) => s.key === "pagesWeek")?.value ?? 0)}
          />
          <ActionCard icon={Camera} title="Seite scannen" href="/scan" hint="Schnell starten" />
          <ActionCard
            icon={Clock}
            title="Zuletzt bearbeitet"
            href="/notebooks?sort=recent"
            hint="Schnell starten"
          />
        </div>

        {/* Main Grid */}
        <div className="mt-6 grid gap-6 lg:grid-cols-3">
          {/* Notebooks */}
          <Card className="lg:col-span-2">
            <CardHeader className="flex items-start justify-between pb-3">
              <div>
                <CardTitle>Deine Notizbücher</CardTitle>
                <CardDescription>Kurzer Überblick & schnelle Aktionen</CardDescription>
              </div>
              <Button variant="ghost" asChild>
                <Link href="/notebooks">
                  Alle ansehen <ChevronRight className="ml-1 h-4 w-4" />
                </Link>
              </Button>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 sm:grid-cols-2">
                {notebooks.map((nb) => (
                  <div key={nb.id} className="rounded-2xl border p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <div className={`h-8 w-8 rounded-lg ${nb.color}`} />
                        <div>
                          <Link href={`/notebooks/${nb.id}`} className="font-medium hover:underline">
                            {nb.title}
                          </Link>
                          <div className="text-xs text-muted-foreground">
                            {nb.pages} Seiten • {nb.lastUpdated}
                          </div>
                        </div>
                      </div>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button size="icon" variant="ghost" className="h-8 w-8" asChild>
                            <Link href={`/notebooks/${nb.id}/settings`} aria-label="Notizbuch-Einstellungen">
                              <Settings className="h-4 w-4" />
                            </Link>
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>Notizbuch-Einstellungen</TooltipContent>
                      </Tooltip>
                    </div>

                    <div className="mt-4">
                      <Progress value={nb.completion} />
                      <div className="mt-1 flex items-center justify-between text-xs text-muted-foreground">
                        <span>Fortschritt</span>
                        <span>{nb.completion}%</span>
                      </div>
                    </div>

                    <div className="mt-4 flex items-center gap-2">
                      <Button asChild size="sm">
                        <Link href={`/notebooks/${nb.id}`}>Öffnen</Link>
                      </Button>
                      <Button asChild size="sm" variant="secondary">
                        <Link href={`/notebooks/${nb.id}/share`}>Teilen</Link>
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Recent Activity */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle>Letzte Aktivitäten</CardTitle>
              <CardDescription>Zuletzt erfasste Seiten & Änderungen</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {recent.map((r) => (
                <Link
                  key={r.id}
                  href={`/pages/${r.id}`}
                  className="group flex items-center gap-3 rounded-xl border p-3 hover:bg-accent"
                >
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg border bg-background">
                    <FileText className="h-5 w-5 text-muted-foreground" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="truncate font-medium">{r.title}</div>
                    <div className="truncate text-xs text-muted-foreground">
                      {r.notebook} • {r.ts}
                    </div>
                  </div>
                  <ChevronRight className="h-4 w-4 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
                </Link>
              ))}
            </CardContent>
          </Card>
        </div>
      </div>
    </TooltipProvider>
  );
}

/* ——— kompaktere, größere Cards ——— */
function MetricCard({
  icon: Icon,
  title,
  value,
}: {
  icon: LucideIcon;
  title: string;
  value: string;
}) {
  return (
    <Card className="shadow-sm">
      <CardContent className="flex flex-col items-center justify-center gap-2 p-4 text-center">
        <div className="flex h-12 w-12 items-center justify-center rounded-xl border">
          <Icon className="h-6 w-6 text-muted-foreground" />
        </div>
        <div className="text-base text-muted-foreground">{title}</div>
        <div className="text-3xl font-bold leading-tight">{value}</div>
      </CardContent>
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
    <Card className="shadow-sm">
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
