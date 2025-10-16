"use client";

import * as React from "react";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  addDays,
  addMinutes,
  differenceInCalendarDays,
  endOfDay,
  endOfMonth,
  endOfWeek,
  format,
  isSameDay,
  isWithinInterval,
  max as dfMax,
  min as dfMin,
  startOfDay,
  startOfMonth,
  startOfWeek,
} from "date-fns";
import { de } from "date-fns/locale";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  EllipsisVertical,
  Plus,
  Trash2,
  Palette,
  Pencil,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import {Clock } from "lucide-react";

/* ---------- Types ---------- */
type Cal = {
  _id: string;
  name: string;
  color: string;
  isDefault?: boolean;
  userId: string;
};
type Ev = {
  _id: string;
  title: string;
  description: string;
  location: string;
  start: string; // ISO
  end: string; // ISO
  allDay: boolean;
  calendarId: string;
  userId: string;
};
type View = "day" | "week" | "month";

/* ---------- Grid constants (15-min raster) ---------- */
const MINUTES_PER_SLOT = 15;
const SLOT_PX = 18;
const PX_PER_MINUTE = SLOT_PX / MINUTES_PER_SLOT;
const DAY_HEIGHT_PX = 24 * 60 * PX_PER_MINUTE;

/* ---------- Calendar Modal ---------- */
function CalendarModal({
  open,
  onOpenChange,
  onSubmit,
  calendar,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onSubmit: (data: { name: string; color: string; id?: string }) => void;
  calendar?: Cal | null;
}) {
  const [name, setName] = React.useState(calendar?.name ?? "");
  const [color, setColor] = React.useState(calendar?.color ?? "#000000");
  const colorInputRef = React.useRef<HTMLInputElement | null>(null);

  React.useEffect(() => {
    setName(calendar?.name ?? "");
    setColor(calendar?.color ?? "#000000");
  }, [calendar, open]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {calendar ? "Kalender bearbeiten" : "Neuen Kalender erstellen"}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-3">
          {/* schöne Farbauswahl */}
          <div className="flex items-center gap-3">
            <button
              type="button"
              aria-label="Farbe wählen"
              className="h-6 w-6 rounded ring-1 ring-black/10"
              style={{ backgroundColor: color }}
              onClick={() => colorInputRef.current?.click()}
            />
            <span className="text-sm text-neutral-600">Farbe</span>
            <input
              ref={colorInputRef}
              type="color"
              value={color}
              onChange={(e) => setColor(e.target.value)}
              className="sr-only"
            />
          </div>

          <Input
            placeholder="Kalendername"
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) =>
              e.key === "Enter" && onSubmit({ name, color, id: calendar?._id })
            }
          />

          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Abbrechen
            </Button>
            <Button
              className="bg-black text-white"
              onClick={() => onSubmit({ name, color, id: calendar?._id })}
            >
              {calendar ? "Speichern" : "Erstellen"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

const MINUTE_STEPS = [0, 15, 30, 45];

function toDateParts(iso?: string) {
  const d = iso ? new Date(iso) : new Date();
  return { d, h: d.getHours(), m: d.getMinutes() - (d.getMinutes() % 15) };
}
function buildISO(date: Date, h: number, m: number) {
  const out = new Date(date);
  out.setHours(h, m, 0, 0);
  return out.toISOString();
}

function DateTimePicker({
  label,
  valueISO,
  onChange,
  disabled,
}: {
  label?: string;
  valueISO?: string | null;
  onChange: (iso: string | null) => void;
  disabled?: boolean;
}) {
  const parts = toDateParts(valueISO ?? undefined);
  const [open, setOpen] = React.useState(false);
  const [date, setDate] = React.useState<Date>(parts.d);
  const [hour, setHour] = React.useState<number>(parts.h);
  const [minute, setMinute] = React.useState<number>(parts.m);

  React.useEffect(() => {
    const p = toDateParts(valueISO ?? undefined);
    setDate(p.d);
    setHour(p.h);
    setMinute(p.m);
  }, [valueISO]);

  const commit = (d = date, h = hour, m = minute) => {
    onChange(buildISO(d, h, m));
  };

  return (
    <div className="flex flex-col gap-1">
      {label && (
        <label className="text-xs font-medium text-neutral-600">{label}</label>
      )}
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            type="button"
            variant="outline"
            className={cn("justify-start gap-2", "w-full")}
            disabled={disabled}
          >
            <CalendarIcon className="h-4 w-4" />
            {valueISO ? (
              <>
                {format(new Date(valueISO), "dd.MM.yyyy HH:mm", { locale: de })}
              </>
            ) : (
              <span>Datum &amp; Zeit wählen</span>
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[280px] px-4 py-3">
          <div className="grid grid-cols-1 gap-3">
            <Calendar
              mode="single"
              selected={date}
              onSelect={(d) => {
                if (!d) return;
                setDate(d);
                commit(d, hour, minute);
              }}
              initialFocus
              locale={de}
            />
            <div className="grid grid-cols-[1fr_1fr] items-center gap-2">
              <div className="text-xs flex items-center gap-2">
                <Clock className="h-4 w-4" />
                Zeit
              </div>
              <div className="grid grid-cols-2 gap-2">
                <Select
                  value={String(hour)}
                  onValueChange={(v) => {
                    const h = Number(v);
                    setHour(h);
                    commit(date, h, minute);
                  }}
                  disabled={disabled}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Std" />
                  </SelectTrigger>
                  <SelectContent>
                    {Array.from({ length: 24 }).map((_, i) => (
                      <SelectItem key={i} value={String(i)}>
                        {String(i).padStart(2, "0")}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select
                  value={String(minute)}
                  onValueChange={(v) => {
                    const m = Number(v);
                    setMinute(m);
                    commit(date, hour, m);
                  }}
                  disabled={disabled}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Min" />
                  </SelectTrigger>
                  <SelectContent>
                    {MINUTE_STEPS.map((m) => (
                      <SelectItem key={m} value={String(m)}>
                        {String(m).padStart(2, "0")}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <Button
                type="button"
                variant="ghost"
                className="text-red-600"
                onClick={() => {
                  onChange(null);
                  setOpen(false);
                }}
              >
                Löschen
              </Button>
              <Button
                type="button"
                variant="ghost"
                onClick={() => {
                  const now = new Date();
                  now.setSeconds(0, 0);
                  const snapMin = MINUTE_STEPS.reduce((prev, cur) =>
                    Math.abs(cur - now.getMinutes()) <
                    Math.abs(prev - now.getMinutes())
                      ? cur
                      : prev
                  );
                  setDate(now);
                  setHour(now.getHours());
                  setMinute(snapMin);
                  onChange(buildISO(now, now.getHours(), snapMin));
                }}
              >
                Jetzt
              </Button>
            </div>
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}


/* ---------- Component ---------- */
export default function CalendarBoard({
  userId,
  initialCalendars,
}: {
  userId: string;
  initialCalendars: Cal[];
}) {
  const [calendars, setCalendars] = useState<Cal[]>(initialCalendars);
  const [selectedCalIds, setSelectedCalIds] = useState<string[]>(
    initialCalendars.map((c) => c._id)
  );
  const [events, setEvents] = useState<Ev[]>([]);
  const [view, setView] = useState<View>("week");
  const [anchor, setAnchor] = useState<Date>(startOfDay(new Date()));

  const [editOpen, setEditOpen] = useState(false);
  const [editing, setEditing] = useState<Partial<Ev> & { _id?: string }>({});

  const [calModalOpen, setCalModalOpen] = useState(false);
  const [calEditing, setCalEditing] = useState<Cal | null>(null);

  const gridRef = useRef<HTMLDivElement | null>(null);

  /* ---------- Data fetch ---------- */
  useEffect(() => {
    const [min, max] = rangeForView(anchor, view);
    const qs = new URLSearchParams({
      userId,
      timeMin: min.toISOString(),
      timeMax: max.toISOString(),
    });
    selectedCalIds.forEach((id) => qs.append("calendarId", id));
    fetch(`/api/events?${qs}`)
      .then((r) => r.json())
      .then((d) => setEvents(d.items || []));
  }, [anchor, view, userId, selectedCalIds]);

  /* ---------- Helpers ---------- */
  function rangeForView(base: Date, v: View): [Date, Date] {
    if (v === "day") return [startOfDay(base), addDays(startOfDay(base), 1)];
    if (v === "week")
      return [
        startOfWeek(base, { locale: de }),
        addDays(endOfWeek(base, { locale: de }), 1),
      ];
    const start = startOfWeek(startOfMonth(base), { locale: de });
    const end = addDays(endOfWeek(endOfMonth(base), { locale: de }), 1);
    return [start, end];
  }
  const daysForWeek = useMemo(() => {
    const start = startOfWeek(anchor, { locale: de });
    return [...Array(7)].map((_, i) => addDays(start, i));
  }, [anchor]);

  function bgFor(calendarId: string) {
    const c = calendars.find((x) => x._id === calendarId);
    const col = c?.color || "#000000";
    return col + "cc";
  }
  function borderFor(calendarId: string) {
    const c = calendars.find((x) => x._id === calendarId);
    return c?.color || "#000000";
  }
  function toggleCal(id: string) {
    setSelectedCalIds((p) =>
      p.includes(id) ? p.filter((x) => x !== id) : [...p, id]
    );
  }

  /* ---------- Create / Update / Delete Events ---------- */
  function openNewAt(date: Date, calendarId?: string) {
    setEditing({
      title: "",
      description: "",
      location: "",
      start: date.toISOString(),
      end: addMinutes(date, 60).toISOString(),
      allDay: false,
      calendarId: calendarId || selectedCalIds[0],
      userId,
    });
    setEditOpen(true);
  }

  async function saveEvent() {
    if (!editing.title || !editing.start || !editing.end || !editing.calendarId)
      return;

    let startISO = editing.start;
    let endISO = editing.end;

    if (editing.allDay) {
      const s = startOfDay(new Date(editing.start));
      const e = endOfDay(new Date(editing.end));
      startISO = s.toISOString();
      endISO = e.toISOString();
    }

    const payload = {
      title: editing.title,
      description: editing.description || "",
      location: editing.location || "",
      start: startISO,
      end: endISO,
      allDay: !!editing.allDay,
      calendarId: editing.calendarId,
      userId,
    };
    if (editing._id) {
      const res = await fetch(`/api/events/${editing._id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const ev = await res.json();
      setEvents((prev) => prev.map((e) => (e._id === ev._id ? ev : e)));
    } else {
      const res = await fetch(`/api/events`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const ev = await res.json();
      setEvents((prev) => [...prev, ev]);
    }
    setEditOpen(false);
  }

  async function deleteEvent(id: string) {
    await fetch(`/api/events/${id}`, { method: "DELETE" });
    setEvents((prev) => prev.filter((e) => e._id !== id));
    setEditOpen(false);
  }

  /* ---------- Drag / Resize (inkl. Tag-Verschub) ---------- */
  function startDrag(
    ev: Ev,
    e: React.MouseEvent,
    type: "move" | "resize-start" | "resize-end"
  ) {
    e.preventDefault();
    e.stopPropagation();

    const startPosY = e.clientY;
    const startPosX = e.clientX;

    const startStart = new Date(ev.start);
    const startEnd = new Date(ev.end);

    const container = gridRef.current;
    const cols = view === "day" ? 1 : 7;
    const colWidth = container?.getBoundingClientRect().width
      ? container.getBoundingClientRect().width / cols
      : 0;

    const onMove = (me: MouseEvent) => {
      const dy = me.clientY - startPosY;
      const steps = Math.round(dy / SLOT_PX);
      const deltaMin = steps * MINUTES_PER_SLOT;

      let dayDelta = 0;
      if (view !== "month" && colWidth > 0 && type === "move") {
        const dx = me.clientX - startPosX;
        dayDelta = Math.round(dx / colWidth);
      }

      let newStart = addDays(startStart, dayDelta);
      let newEnd = addDays(startEnd, dayDelta);

      if (type === "move") {
        newStart = addMinutes(newStart, deltaMin);
        newEnd = addMinutes(newEnd, deltaMin);
      } else if (type === "resize-start") {
        newStart = addMinutes(newStart, deltaMin);
        if (newStart >= newEnd)
          newStart = addMinutes(newEnd, -MINUTES_PER_SLOT);
      } else {
        newEnd = addMinutes(newEnd, deltaMin);
        if (newEnd <= newStart) newEnd = addMinutes(newStart, MINUTES_PER_SLOT);
      }

      setEvents((prev) =>
        prev.map((e) =>
          e._id === ev._id
            ? { ...e, start: newStart.toISOString(), end: newEnd.toISOString() }
            : e
        )
      );
    };

    const onUp = async () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
      const changed = events.find((e) => e._id === ev._id);
      if (changed) {
        await fetch(`/api/events/${ev._id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ start: changed.start, end: changed.end }),
        });
      }
    };

    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
  }

  /* ---------- Render timed block ---------- */
function EventBlock({ ev }: { ev: Ev }) {
  const start = new Date(ev.start);
  const end = new Date(ev.end);
  const durM = (end.getTime() - start.getTime()) / 60000;
  const minutesFromMidnight = start.getHours() * 60 + start.getMinutes();
  const topPx = minutesFromMidnight * PX_PER_MINUTE;
  const heightPx = Math.max(durM * PX_PER_MINUTE, SLOT_PX);

  return (
    <div
      className="absolute left-1 right-1 rounded-md text-xs shadow-sm"
      style={{
        top: `${topPx}px`,
        height: `${heightPx}px`,
        background: bgFor(ev.calendarId),
        borderLeft: `4px solid ${borderFor(ev.calendarId)}`,
      }}
      onDoubleClick={(e) => {
        e.stopPropagation(); // 👈 verhindert „Neuen Termin anlegen“
        setEditing(ev);
        setEditOpen(true);
      }}
    >
      <div
        className="flex h-full w-full flex-col overflow-hidden rounded-md text-white"
        onDoubleClick={() => {
          setEditing(ev);
          setEditOpen(true);
        }}
      >
        {/* top resize handle */}
        <div
          className="relative z-10 h-[6px] w-full cursor-ns-resize rounded-t-md bg-black/25"
          onMouseDown={(e) => startDrag(ev, e, "resize-start")}
          title="Oben ziehen, um die Startzeit zu ändern"
        />

        {/* header (drag-move) */}
        <div
          className="flex cursor-move items-center justify-between px-2 pt-1"
          onMouseDown={(e) => startDrag(ev, e, "move")}
        >
          <span className="truncate font-medium">{ev.title}</span>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="rounded p-1 hover:bg-white/20">
                <EllipsisVertical className="h-4 w-4" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem
                onClick={() => {
                  setEditing(ev);
                  setEditOpen(true);
                }}
              >
                Bearbeiten
              </DropdownMenuItem>
              <DropdownMenuItem
                className="text-red-600"
                onClick={() => deleteEvent(ev._id)}
              >
                Löschen
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        <div className="px-2 pb-1 opacity-90">
          {format(start, "HH:mm")}–{format(end, "HH:mm")}
        </div>

        {/* bottom resize handle */}
        <div
          className="relative z-10 mt-auto h-[6px] w-full cursor-ns-resize rounded-b-md bg-black/25"
          onMouseDown={(e) => startDrag(ev, e, "resize-end")}
          title="Unten ziehen, um die Endzeit zu ändern"
        />
      </div>
    </div>
  );
}

  /* ---------- All-day (Day/Week) ---------- */
  function AllDayRow({ day }: { day: Date }) {
    const items = events.filter(
      (e) =>
        e.allDay &&
        selectedCalIds.includes(e.calendarId) &&
        isWithinInterval(day, {
          start: startOfDay(new Date(e.start)),
          end: endOfDay(new Date(e.end)),
        })
    );
    return (
      <div className="min-h-[28px] border-b bg-neutral-50/60 px-1 py-1">
        <div className="flex flex-wrap gap-1">
          {items.map((ev) => (
            <div
              key={ev._id}
              className="flex cursor-move items-center gap-1 rounded bg-black/10 px-2 py-0.5 text-xs"
              style={{ borderLeft: `4px solid ${borderFor(ev.calendarId)}` }}
              onMouseDown={(e) => startDrag(ev, e, "move")}
              onDoubleClick={(e) => {
                e.stopPropagation(); // 👈 wichtig
                setEditing(ev);
                setEditOpen(true);
              }}
            >
              {ev.title}
            </div>
          ))}
        </div>
      </div>
    );
  }

  /* ---------- Month multi-day spans ---------- */
  function MonthGrid() {
    const gridStart = startOfWeek(startOfMonth(anchor), { locale: de });
    const cells = [...Array(42)].map((_, i) => addDays(gridStart, i));

    const barsByWeek: React.ReactNode[] = [];
    for (let w = 0; w < 6; w++) {
      const weekStart = addDays(gridStart, w * 7);
      const weekEnd = endOfWeek(weekStart, { locale: de });

      const weekEv = events.filter((e) => {
        const s = startOfDay(new Date(e.start));
        const en = endOfDay(new Date(e.end));
        const spansDays =
          differenceInCalendarDays(en, s) >= 1 || e.allDay === true;
        const overlap =
          dfMax([s, weekStart]).getTime() <= dfMin([en, weekEnd]).getTime();
        return selectedCalIds.includes(e.calendarId) && spansDays && overlap;
      });

      if (weekEv.length === 0) {
        barsByWeek.push(
          <div key={`wbar-${w}`} className="col-span-7 h-[2px]" />
        );
        continue;
      }

      const barRow = (
        <div
          key={`wbar-${w}`}
          className="grid grid-cols-7 gap-[2px] px-[2px] pb-1 pt-1"
        >
          {weekEv.map((e) => {
            const s = startOfDay(new Date(e.start));
            const en = endOfDay(new Date(e.end));
            const segStart = dfMax([s, weekStart]);
            const segEnd = dfMin([en, weekEnd]);

            const startCol = Math.max(
              0,
              differenceInCalendarDays(segStart, weekStart)
            );
            const spanDays = differenceInCalendarDays(segEnd, segStart) + 1;

            return (
              <div
                key={`wk-${w}-${e._id}`}
                className="truncate rounded bg-black/10 px-2 py-1 text-xs"
                style={{
                  gridColumn: `${startCol + 1} / span ${Math.max(spanDays, 1)}`,
                  borderLeft: `4px solid ${borderFor(e.calendarId)}`,
                }}
                onDoubleClick={() => {
                  setEditing(e);
                  setEditOpen(true);
                }}
              >
                {e.title}
              </div>
            );
          })}
        </div>
      );
      barsByWeek.push(barRow);
    }

    return (
      <div className="border">
        {barsByWeek[0]}
        <div className="grid grid-cols-7">
          {cells.map((day, i) => {
            const dayEvents = events.filter(
              (e) =>
                selectedCalIds.includes(e.calendarId) &&
                !e.allDay &&
                isSameDay(new Date(e.start), day)
            );
            return (
              <div key={i} className="h-36 border-l border-t p-1">
                <div
                  className={cn(
                    "mb-1 text-xs",
                    day.getMonth() !== anchor.getMonth() && "opacity-40"
                  )}
                >
                  {format(day, "d.", { locale: de })}
                </div>
                <div className="space-y-1">
                  {dayEvents.slice(0, 3).map((ev) => (
                    <div
                      key={ev._id}
                      className="truncate rounded bg-black/10 px-2 py-1 text-xs"
                      style={{
                        borderLeft: `4px solid ${borderFor(ev.calendarId)}`,
                      }}
                      onDoubleClick={() => {
                        setEditing(ev);
                        setEditOpen(true);
                      }}
                    >
                      {ev.title} {format(new Date(ev.start), "HH:mm")}
                    </div>
                  ))}
                  {dayEvents.length > 3 && (
                    <button
                      className="text-xs text-neutral-500"
                      onClick={() => {
                        setAnchor(day);
                        setView("day");
                      }}
                    >
                      +{dayEvents.length - 3} mehr
                    </button>
                  )}
                </div>
                {i % 7 === 6 && barsByWeek[Math.floor(i / 7) + 1]}
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  /* ---------- Calendar CRUD via Modal ---------- */
  const openCreateCalendar = () => {
    setCalEditing(null);
    setCalModalOpen(true);
  };
  const openEditCalendar = (c: Cal) => {
    setCalEditing(c);
    setCalModalOpen(true);
  };
  const submitCalendar = async (data: {
    name: string;
    color: string;
    id?: string;
  }) => {
    if (!data.name.trim()) return;
    if (data.id) {
      const res = await fetch(`/api/calendars/${data.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: data.name.trim(), color: data.color }),
      });
      const cal = await res.json();
      setCalendars((p) =>
        p.map((x) =>
          x._id === cal._id ? { ...x, name: cal.name, color: cal.color } : x
        )
      );
    } else {
      const res = await fetch("/api/calendars", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: data.name.trim(),
          color: data.color,
          userId,
        }),
      });
      const cal = await res.json();
      setCalendars((p) => [...p, cal]);
      setSelectedCalIds((p) => [...p, cal._id]);
    }
    setCalModalOpen(false);
  };

  /* ---------- UI ---------- */
  return (
    <div className="flex min-h-[calc(100vh-2rem)] gap-4">
      {/* Sticky Sidebar */}
      <div className="md:sticky md:top-4 md:self-start md:h-[calc(100vh-2rem)] md:w-[280px]">
        <Card className="h-full p-3">
          <div className="mb-3 flex items-center justify-between">
            <div className="text-sm font-semibold">Kalender</div>
            <Button
              size="sm"
              className="bg-black text-white"
              onClick={openCreateCalendar}
            >
              <Plus className="mr-1 h-4 w-4" /> Neu
            </Button>
          </div>
          <ScrollArea className="h-[calc(100%-44px)]">
            <div className="space-y-2 pr-1">
              {calendars.map((c) => (
                <div
                  key={c._id}
                  className={cn(
                    "flex items-center justify-between rounded-lg border p-2",
                    selectedCalIds.includes(c._id)
                      ? "bg-black text-white"
                      : "bg-white"
                  )}
                >
                  <button
                    className="flex-1 text-left text-sm"
                    onClick={() => toggleCal(c._id)}
                  >
                    {c.name}
                  </button>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        className={cn(
                          "hover:bg-white/10 hover:text-white",
                          selectedCalIds.includes(c._id)
                            ? "hover:text-white"
                            : "hover:text-black"
                        )}
                      >
                        <EllipsisVertical className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => openEditCalendar(c)}>
                        <Pencil className="mr-2 h-4 w-4" />
                        Bearbeiten
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        className="text-red-600"
                        onClick={async () => {
                          await fetch(`/api/calendars/${c._id}`, {
                            method: "DELETE",
                          });
                          setCalendars((p) => p.filter((x) => x._id !== c._id));
                          setSelectedCalIds((p) =>
                            p.filter((x) => x !== c._id)
                          );
                          setEvents((p) =>
                            p.filter((e) => e.calendarId !== c._id)
                          );
                        }}
                      >
                        <Trash2 className="mr-2 h-4 w-4" />
                        Löschen
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              ))}
            </div>
          </ScrollArea>
        </Card>
      </div>

      {/* Main */}
      <div className="relative flex-1 overflow-auto">
        <div className="mb-3 flex flex-wrap items-center gap-2">
          <Button variant="outline" onClick={() => setAnchor(new Date())}>
            <CalendarIcon className="mr-2 h-4 w-4" />
            Heute
          </Button>
          <Button
            variant="outline"
            onClick={() =>
              setAnchor(
                addDays(
                  anchor,
                  view === "day" ? -1 : view === "week" ? -7 : -30
                )
              )
            }
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            onClick={() =>
              setAnchor(
                addDays(
                  anchor,
                  view === "day" ? +1 : view === "week" ? +7 : +30
                )
              )
            }
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
          <div className="ml-2 text-lg font-semibold">
            {view === "month"
              ? format(anchor, "LLLL yyyy", { locale: de })
              : format(anchor, "PPPP", { locale: de })}
          </div>
          <div className="ml-auto">
            <Select value={view} onValueChange={(v: View) => setView(v)}>
              <SelectTrigger className="w-[160px]">
                <SelectValue placeholder="Ansicht" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="day">Tag</SelectItem>
                <SelectItem value="week">Woche</SelectItem>
                <SelectItem value="month">Monat</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <Button
            className="bg-black text-white"
            onClick={() => openNewAt(new Date())}
          >
            <Plus className="mr-2 h-4 w-4" /> Termin
          </Button>
        </div>

        {/* Day/Week */}
        {view !== "month" ? (
          <div className="grid grid-cols-[60px_1fr] border">
            {/* Stunden-Skala */}
            <div className="border-r">
              {[...Array(24)].map((_, h) => (
                <div
                  key={h}
                  className="h-[72px] select-none pr-2 text-right text-xs text-neutral-500"
                  style={{ lineHeight: `${SLOT_PX * 4}px` }}
                >
                  {String(h).padStart(2, "0")}:00
                </div>
              ))}
            </div>

            {/* Spalten */}
            <div
              ref={gridRef}
              className={cn(
                "relative",
                view === "day" ? "grid grid-cols-1" : "grid grid-cols-7"
              )}
            >
              {(view === "day" ? [anchor] : daysForWeek).map((d) => {
                const dayTimed = events.filter(
                  (e) =>
                    !e.allDay &&
                    selectedCalIds.includes(e.calendarId) &&
                    isWithinInterval(new Date(e.start), {
                      start: startOfDay(d),
                      end: addDays(startOfDay(d), 1),
                    })
                );
                return (
                  <div key={d.toISOString()} className="relative border-l">
                    {/* All-day row */}
                    <AllDayRow day={d} />

                    {/* Header */}
                    <div className="sticky top-0 z-10 bg-white/80 p-2 text-sm font-medium">
                      {format(d, "EEE dd.MM.", { locale: de })}
                    </div>

                    {/* Timed area */}
                    <div
                      className="relative bg-white"
                      style={{ height: `${DAY_HEIGHT_PX}px` }}
                      onDoubleClick={(e) => {
                        const rect = (
                          e.currentTarget as HTMLDivElement
                        ).getBoundingClientRect();
                        const y = e.clientY - rect.top;
                        const minutes =
                          Math.round(y / SLOT_PX) * MINUTES_PER_SLOT;
                        openNewAt(addMinutes(startOfDay(d), minutes));
                      }}
                    >
                      {/* Grid Lines (15min) */}
                      {[...Array(24 * (60 / MINUTES_PER_SLOT))].map((_, i) => {
                        const isHour = i % (60 / MINUTES_PER_SLOT) === 0;
                        return (
                          <div
                            key={i}
                            className={cn(
                              "absolute left-0 right-0",
                              isHour ? "border-t" : "border-t border-dashed"
                            )}
                            style={{ top: `${i * SLOT_PX}px` }}
                          />
                        );
                      })}

                      {dayTimed.map((ev) => (
                        <EventBlock key={ev._id} ev={ev} />
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ) : (
          <MonthGrid />
        )}
      </div>

      {/* Event Dialog */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editing._id ? "Termin bearbeiten" : "Neuer Termin"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-2">
            <Input
              placeholder="Titel"
              value={editing.title || ""}
              onChange={(e) =>
                setEditing((p) => ({ ...p, title: e.target.value }))
              }
            />
            <Textarea
              placeholder="Beschreibung"
              value={editing.description || ""}
              onChange={(e) =>
                setEditing((p) => ({ ...p, description: e.target.value }))
              }
            />
            <Input
              placeholder="Ort"
              value={editing.location || ""}
              onChange={(e) =>
                setEditing((p) => ({ ...p, location: e.target.value }))
              }
            />
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              <DateTimePicker
                label="Beginn"
                valueISO={editing.start ?? null}
                onChange={(iso) =>
                  setEditing((p) => {
                    const next = { ...p, start: iso ?? p.start };
                    // falls Ende vor Start -> Ende nachziehen (1h)
                    if (
                      next.start &&
                      next.end &&
                      new Date(next.end) < new Date(next.start)
                    ) {
                      const d = new Date(next.start);
                      d.setMinutes(d.getMinutes() + 60);
                      next.end = d.toISOString();
                    }
                    return next;
                  })
                }
                disabled={!!editing.allDay}
              />
              <DateTimePicker
                label="Ende"
                valueISO={editing.end ?? null}
                onChange={(iso) =>
                  setEditing((p) => {
                    const next = { ...p, end: iso ?? p.end };
                    // falls Ende vor Start -> Start vorziehen
                    if (
                      next.start &&
                      next.end &&
                      new Date(next.end) < new Date(next.start)
                    ) {
                      const d = new Date(next.end);
                      d.setMinutes(d.getMinutes() - 60);
                      next.start = d.toISOString();
                    }
                    return next;
                  })
                }
                disabled={!!editing.allDay}
              />
            </div>

            {/* Label „Kalender“ + Dropdown (wie zuletzt gewünscht) */}
            <div className="space-y-1">
              <label className="text-xs font-medium text-neutral-600">
                Kalender
              </label>
              <Select
                value={editing.calendarId}
                onValueChange={(v) =>
                  setEditing((p) => ({ ...p, calendarId: v }))
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Kalender wählen" />
                </SelectTrigger>
                <SelectContent>
                  {calendars.map((c) => (
                    <SelectItem key={c._id} value={c._id}>
                      {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center gap-2">
              <Checkbox
                checked={!!editing.allDay}
                onCheckedChange={(v) =>
                  setEditing((p) => {
                    const allDay = !!v;
                    if (allDay && p.start && p.end) {
                      const s = startOfDay(new Date(p.start));
                      const e = endOfDay(new Date(p.end));
                      return {
                        ...p,
                        allDay,
                        start: s.toISOString(),
                        end: e.toISOString(),
                      };
                    }
                    return { ...p, allDay };
                  })
                }
              />
              <span className="text-sm">Ganztägig</span>
            </div>
            <div className="space-y-1 flex items-center space-x-4">
              <label className="text-xs font-medium text-neutral-600">
                Kalender
              </label>
              <Select
                value={editing.calendarId}
                onValueChange={(v) =>
                  setEditing((p) => ({ ...p, calendarId: v }))
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Kalender wählen" />
                </SelectTrigger>
                <SelectContent>
                  {calendars.map((c) => (
                    <SelectItem key={c._id} value={c._id}>
                      {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex justify-between">
              {editing._id ? (
                <Button
                  variant="destructive"
                  onClick={() => deleteEvent(editing._id!)}
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  Löschen
                </Button>
              ) : (
                <div />
              )}
              <div className="ml-auto flex gap-2">
                <Button variant="outline" onClick={() => setEditOpen(false)}>
                  Abbrechen
                </Button>
                <Button className="bg-black text-white" onClick={saveEvent}>
                  Speichern
                </Button>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Calendar Modal */}
      <CalendarModal
        open={calModalOpen}
        onOpenChange={setCalModalOpen}
        onSubmit={submitCalendar}
        calendar={calEditing}
      />
    </div>
  );
}

/* ---------- utils ---------- */
function toLocal(iso: string) {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(
    d.getHours()
  )}:${pad(d.getMinutes())}`;
}
function fromLocal(s: string) {
  if (!s) return "";
  const d = new Date(s);
  return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString();
}
