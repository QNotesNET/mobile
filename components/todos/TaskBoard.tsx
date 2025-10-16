"use client";

import * as React from "react";
import { useState, useEffect, useMemo } from "react";
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  verticalListSortingStrategy,
  arrayMove,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { motion, AnimatePresence } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from "@/components/ui/dropdown-menu";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectGroup,
  SelectItem,
} from "@/components/ui/select";
import {
  Popover,
  PopoverTrigger,
  PopoverContent,
} from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { cn } from "@/lib/utils";
import {
  CalendarDays,
  MoreVertical,
  Plus,
  EllipsisVertical,
  Pencil,
  Trash2,
  Loader2,
} from "lucide-react";
import { format } from "date-fns";
import { de } from "date-fns/locale";

type Priority = "none" | "low" | "medium" | "high";

export type Task = {
  _id: string;
  title: string;
  note?: string;
  completed: boolean;
  dueAt?: string | null;
  order: number;
  priority: Priority;
  listId: string;
  userId: string;
  createdAt: string;
  updatedAt: string;
};

export type TaskList = {
  _id: string;
  name: string;
  userId: string;
  createdAt: string;
  updatedAt: string;
  openCount?: number;
};

function isToday(ts?: string | null) {
  if (!ts) return false;
  const d = new Date(ts);
  const n = new Date();
  return (
    d.getFullYear() === n.getFullYear() &&
    d.getMonth() === n.getMonth() &&
    d.getDate() === n.getDate()
  );
}

function formatDate(ts?: string | null) {
  if (!ts) return "Ohne Fälligkeitsdatum";
  const d = new Date(ts);
  return format(d, "dd. MMM yyyy", { locale: de });
}

function priorityLabel(p: Priority) {
  switch (p) {
    case "low":
      return "Niedrig";
    case "medium":
      return "Mittel";
    case "high":
      return "Hoch";
    default:
      return "Keine";
  }
}

function priorityBadge(p: Priority) {
  const base = "border px-2 py-0.5 text-xs rounded-full";
  switch (p) {
    case "high":
      return cn(base, "border-black text-black font-semibold");
    case "medium":
      return cn(base, "border-neutral-600 text-neutral-700");
    case "low":
      return cn(base, "border-neutral-300 text-neutral-500");
    default:
      return cn(base, "border-neutral-200 text-neutral-400");
  }
}

function SortableTaskItem({
  task,
  onToggle,
  onRemove,
  onMove,
  onOpenEdit,
  lists,
}: {
  task: Task;
  onToggle: (t: Task) => void;
  onRemove: (id: string) => void;
  onMove: (taskId: string, targetListId: string) => void;
  onOpenEdit: (t: Task) => void;
  lists: TaskList[];
}) {
  const { attributes, listeners, setNodeRef, transform, transition } =
    useSortable({ id: task._id });
  const style = { transform: CSS.Transform.toString(transform), transition };

  return (
    <div ref={setNodeRef} style={style} {...attributes} {...listeners}>
      <motion.div
        layout
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -6 }}
        className="flex items-start gap-3 rounded-xl border border-gray-200 bg-white p-3 shadow-sm"
      >
        <Checkbox
          checked={task.completed}
          onCheckedChange={() => onToggle(task)}
          className="mt-0.5"
        />
        <div className="flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <motion.span
              animate={{
                textDecoration: task.completed ? "line-through" : "none",
                opacity: task.completed ? 0.6 : 1,
              }}
              className="text-sm font-medium text-black"
            >
              {task.title}
            </motion.span>
            <span className={priorityBadge(task.priority)}>
              {priorityLabel(task.priority)}
            </span>
            {isToday(task.dueAt || undefined) && (
              <Badge className="bg-black text-white">Heute</Badge>
            )}
          </div>
          {(task.note || task.dueAt) && (
            <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-neutral-600">
              {task.note && <span>{task.note}</span>}
              {task.dueAt && (
                <span className="inline-flex items-center gap-1">
                  <CalendarDays className="h-3.5 w-3.5" />
                  Fällig: {formatDate(task.dueAt)}
                </span>
              )}
            </div>
          )}
        </div>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon">
              <MoreVertical className="h-4 w-4 text-black" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => onToggle(task)}>
              {task.completed ? "Als offen markieren" : "Abhaken"}
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onOpenEdit(task)}>
              Bearbeiten
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => onRemove(task._id)}
              className="text-red-600"
            >
              Löschen
            </DropdownMenuItem>
            <Separator />
            {lists
              .filter((l) => l._id !== task.listId)
              .map((l) => (
                <DropdownMenuItem
                  key={l._id}
                  onClick={() => onMove(task._id, l._id)}
                >
                  In „{l.name}“ verschieben
                </DropdownMenuItem>
              ))}
            {lists.filter((l) => l._id !== task.listId).length === 0 && (
              <DropdownMenuItem disabled>
                Keine andere Liste vorhanden
              </DropdownMenuItem>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </motion.div>
    </div>
  );
}

export default function TaskBoard({ userId }: { userId: string }) {
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } })
  );
  const [lists, setLists] = useState<TaskList[]>([]);
  const [activeListId, setActiveListId] = useState<string>("");
  const [tasksByList, setTasksByList] = useState<Record<string, Task[]>>({});
  const [openCounts, setOpenCounts] = useState<Record<string, number>>({});
  const [loadingLists, setLoadingLists] = useState(true);
  const [loadingTasks, setLoadingTasks] = useState(false);

  const [newTitle, setNewTitle] = useState("");
  const [newNote, setNewNote] = useState("");
  const [newPriority, setNewPriority] = useState<Priority>("none");
  const [newDue, setNewDue] = useState<Date | undefined>(undefined);
  const [editTask, setEditTask] = useState<Task | null>(null);
  const [createListOpen, setCreateListOpen] = useState(false);
  const [newListName, setNewListName] = useState("");
  const [renameListId, setRenameListId] = useState<string | null>(null);
  const [renameListName, setRenameListName] = useState("");

  useEffect(() => {
    (async () => {
      setLoadingLists(true);
      const res = await fetch(`/api/lists?userId=${userId}&withCounts=true`);
      const data = await res.json();
      const items: TaskList[] = data.items || [];
      setLists(items);
      const cm: Record<string, number> = {};
      items.forEach((l) => (cm[l._id] = l.openCount ?? 0));
      setOpenCounts(cm);
      if (items[0]) setActiveListId(items[0]._id);
      setLoadingLists(false);
    })();
  }, [userId]);

  useEffect(() => {
    if (!activeListId) return;
    (async () => {
      setLoadingTasks(true);
      const res = await fetch(
        `/api/tasks?userId=${userId}&listId=${activeListId}&sort=order:1`
      );
      const data = await res.json();
      const items: Task[] = data.items || [];
      setTasksByList((p) => ({ ...p, [activeListId]: items }));
      setOpenCounts((p) => ({
        ...p,
        [activeListId]: items.filter((t) => !t.completed).length,
      }));
      setLoadingTasks(false);
    })();
  }, [activeListId, userId]);

  const activeList = useMemo(
    () => lists.find((l) => l._id === activeListId) ?? null,
    [lists, activeListId]
  );
  const activeTasks = tasksByList[activeListId] ?? [];
  const openTasks = activeTasks.filter((t) => !t.completed);
  const doneTasks = activeTasks.filter((t) => t.completed);

  const incCount = (listId: string, delta: number) =>
    setOpenCounts((p) => ({
      ...p,
      [listId]: Math.max(0, (p[listId] ?? 0) + delta),
    }));

  const refreshLists = async () => {
    const res = await fetch(`/api/lists?userId=${userId}&withCounts=true`);
    const data = await res.json();
    const items: TaskList[] = data.items || [];
    setLists(items);
    const cm: Record<string, number> = {};
    items.forEach((l) => (cm[l._id] = l.openCount ?? 0));
    setOpenCounts(cm);
  };

  const addTask = async () => {
    if (!newTitle.trim() || !activeList) return;
    const body = {
      title: newTitle.trim(),
      note: newNote.trim(),
      userId,
      listId: activeList._id,
      order: openTasks.length,
      priority: newPriority,
      dueAt: newDue ? newDue.toISOString() : null,
    };
    const res = await fetch("/api/tasks", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const t: Task = await res.json();
    setTasksByList((p) => ({
      ...p,
      [activeListId]: [...(p[activeListId] || []), t],
    }));
    incCount(activeListId, +1);
    setNewTitle("");
    setNewNote("");
    setNewPriority("none");
    setNewDue(undefined);
  };

  const toggleTask = async (task: Task) => {
    const res = await fetch(`/api/tasks/${task._id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ completed: !task.completed }),
    });
    const updated: Task = await res.json();
    setTasksByList((p) => ({
      ...p,
      [activeListId]: (p[activeListId] || []).map((t) =>
        t._id === updated._id ? updated : t
      ),
    }));
    incCount(activeListId, updated.completed ? -1 : +1);
  };

  const removeTask = async (id: string) => {
    const t = activeTasks.find((x) => x._id === id);
    await fetch(`/api/tasks/${id}`, { method: "DELETE" });
    setTasksByList((p) => ({
      ...p,
      [activeListId]: (p[activeListId] || []).filter((x) => x._id !== id),
    }));
    if (t && !t.completed) incCount(activeListId, -1);
  };

  const moveTask = async (taskId: string, targetListId: string) => {
    const t = activeTasks.find((x) => x._id === taskId);
    const res = await fetch(`/api/tasks/${taskId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ listId: targetListId }),
    });
    const updated: Task = await res.json();
    setTasksByList((p) => {
      const from = (p[activeListId] || []).filter((x) => x._id !== taskId);
      const to = [...(p[targetListId] || []), updated];
      return { ...p, [activeListId]: from, [targetListId]: to };
    });
    if (t && !t.completed) {
      incCount(activeListId, -1);
      incCount(targetListId, +1);
    }
  };

  const handleDragEnd = async (e: DragEndEvent) => {
    const { active, over } = e;
    if (!active || !over || active.id === over.id) return;
    const ids = openTasks.map((t) => t._id);
    const oldIndex = ids.indexOf(String(active.id));
    const newIndex = ids.indexOf(String(over.id));
    const reorderedOpen = arrayMove(openTasks, oldIndex, newIndex).map(
      (t, i) => ({ ...t, order: i })
    );
    const reordered = [...reorderedOpen, ...doneTasks];
    setTasksByList((p) => ({ ...p, [activeListId]: reordered }));
    await Promise.all(
      reorderedOpen.map((t) =>
        fetch(`/api/tasks/${t._id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ order: t.order }),
        })
      )
    );
  };

  const saveEdit = async () => {
    if (!editTask) return;
    const payload = {
      title: editTask.title,
      note: editTask.note ?? "",
      dueAt: editTask.dueAt ?? null,
      priority: editTask.priority,
    };
    const res = await fetch(`/api/tasks/${editTask._id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const updated: Task = await res.json();
    setTasksByList((p) => ({
      ...p,
      [activeListId]: (p[activeListId] || []).map((t) =>
        t._id === updated._id ? updated : t
      ),
    }));
    setEditTask(null);
  };

  const createList = async () => {
    if (!newListName.trim()) return;
    const res = await fetch(`/api/lists`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: newListName.trim(), userId }),
    });
    const list: TaskList = await res.json();
    setCreateListOpen(false);
    setNewListName("");
    await refreshLists();
    setActiveListId(list._id);
  };

  const renameList = async () => {
    if (!renameListId || !renameListName.trim()) return;
    await fetch(`/api/lists/${renameListId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: renameListName.trim() }),
    });
    setRenameListId(null);
    setRenameListName("");
    await refreshLists();
  };

  const deleteList = async (id: string) => {
    await fetch(`/api/lists/${id}`, { method: "DELETE" });
    await refreshLists();
    if (lists.length) setActiveListId(lists[0]?._id || "");
  };

  return (
    <div className="flex min-h-[calc(100vh-2rem)] bg-white">
      <div className="hidden w-[300px] border-r border-gray-200 p-4 md:block">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-base font-semibold text-black">Listen</h2>
          <Button
            size="icon"
            className="h-8 w-8 bg-black/80 text-white"
            onClick={() => setCreateListOpen(true)}
          >
            <Plus className="h-4 w-4" />
          </Button>
        </div>
        <Separator className="mb-4" />
        {loadingLists ? (
          <div className="mt-3 space-y-2">
            <div className="h-10 w-full animate-pulse rounded-lg bg-neutral-100" />
            <div className="h-10 w-full animate-pulse rounded-lg bg-neutral-100" />
            <div className="h-10 w-full animate-pulse rounded-lg bg-neutral-100" />
          </div>
        ) : (
          <ScrollArea className="h-[calc(100vh-200px)]">
            <div className="flex flex-col gap-2">
              {lists.map((l) => {
                const count = openCounts[l._id] ?? 0;
                const active = l._id === activeListId;
                return (
                  <div
                    key={l._id}
                    onClick={() => setActiveListId(l._id)}
                    className={`flex items-center gap-2 rounded-lg border border-gray-200 p-2 ${
                      active ? "bg-black text-white" : "bg-white text-black"
                    }`}
                  >
                    <button className="flex-1 text-left text-sm font-medium">
                      {l.name}
                    </button>
                    <span
                      className={`rounded-full px-2 py-0.5 text-xs ${
                        active ? "bg-white text-black" : "bg-black text-white"
                      }`}
                    >
                      {count}
                    </span>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant={active ? "secondary" : "ghost"}
                          size="icon"
                          className="bg-transparent text-white hover:bg-white/20 cursor-pointer"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <EllipsisVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem
                          onClick={() => {
                            setRenameListId(l._id);
                            setRenameListName(l.name);
                          }}
                        >
                          <Pencil className="mr-2 h-4 w-4" /> Umbenennen
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          className="text-red-600"
                          onClick={() => deleteList(l._id)}
                        >
                          <Trash2 className="mr-2 h-4 w-4" /> Löschen
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                );
              })}
            </div>
          </ScrollArea>
        )}
      </div>

      <div className="relative flex-1 p-4 md:p-6">
        {(loadingLists || loadingTasks) && (
          <div className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center bg-white/60">
            <Loader2 className="h-6 w-6 animate-spin text-black" />
          </div>
        )}

        <div className="mb-4 md:hidden flex items-center gap-2">
          <Select
            value={activeListId}
            onValueChange={(v) => setActiveListId(v)}
          >
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Liste auswählen" />
            </SelectTrigger>
            <SelectContent>
              <SelectGroup>
                {lists.map((l) => (
                  <SelectItem key={l._id} value={l._id}>
                    {l.name} ({openCounts[l._id] ?? 0})
                  </SelectItem>
                ))}
              </SelectGroup>
            </SelectContent>
          </Select>
          <Button
            size="icon"
            className="h-9 w-9 bg-black text-white"
            onClick={() => setCreateListOpen(true)}
          >
            <Plus className="h-4 w-4" />
          </Button>
        </div>

        <Card className="h-full border-gray-200">
          <CardHeader>
            <CardTitle className="flex items-center justify-between text-xl text-black">
              {activeList?.name ?? "Tasks"}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="mb-4 grid w-full grid-cols-1 gap-2 sm:grid-cols-[1fr_auto]">
              <Input
                placeholder="Neue Aufgabe… Titel"
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
              />
              <Button
                onClick={addTask}
                className="bg-black text-white hover:bg-black/80 cursor-pointer hidden lg:flex"
              >
                <Plus className="mr-1 h-4 w-4 text-white" /> Hinzufügen
              </Button>
            </div>

            <div className="mb-4 grid grid-cols-1 gap-2 sm:grid-cols-3">
              <Textarea
                placeholder="Beschreibung"
                value={newNote}
                onChange={(e) => setNewNote(e.target.value)}
                className="sm:col-span-2"
              />
              <div className="flex flex-col items-center gap-2">
                <Select
                  value={newPriority}
                  onValueChange={(v: Priority) => setNewPriority(v)}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Priorität" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Keine Priorität</SelectItem>
                    <SelectItem value="low">Niedrig</SelectItem>
                    <SelectItem value="medium">Mittel</SelectItem>
                    <SelectItem value="high">Hoch</SelectItem>
                  </SelectContent>
                </Select>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="w-full justify-start">
                      {newDue
                        ? format(newDue, "dd.MM.yyyy")
                        : "Fälligkeitsdatum"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={newDue}
                      onSelect={setNewDue}
                      locale={de}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>
              <Button
                onClick={addTask}
                className="bg-black text-white hover:bg-black/80 cursor-pointer lg:hidden"
              >
                <Plus className="mr-1 h-4 w-4 text-white" /> Hinzufügen
              </Button>
            </div>

            <Separator className="mb-4" />

            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={handleDragEnd}
            >
              <SortableContext
                items={openTasks.map((t) => t._id)}
                strategy={verticalListSortingStrategy}
              >
                <div className="flex flex-col gap-2">
                  <AnimatePresence initial={false}>
                    {openTasks.map((t) => (
                      <SortableTaskItem
                        key={t._id}
                        task={t}
                        onToggle={toggleTask}
                        onRemove={removeTask}
                        onMove={moveTask}
                        onOpenEdit={(task) => setEditTask(task)}
                        lists={lists}
                      />
                    ))}
                  </AnimatePresence>
                </div>
              </SortableContext>
            </DndContext>

            {doneTasks.length > 0 && (
              <>
                <Separator className="my-6" />
                <h3 className="mb-2 text-sm font-semibold text-neutral-700">
                  Erledigte Aufgaben
                </h3>
                <div className="flex flex-col gap-2 opacity-75">
                  {doneTasks.map((t) => (
                    <SortableTaskItem
                      key={t._id}
                      task={t}
                      onToggle={toggleTask}
                      onRemove={removeTask}
                      onMove={moveTask}
                      onOpenEdit={(task) => setEditTask(task)}
                      lists={lists}
                    />
                  ))}
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      <Dialog
        open={!!editTask}
        onOpenChange={(open) => !open && setEditTask(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Aufgabe bearbeiten</DialogTitle>
          </DialogHeader>
          {editTask && (
            <div className="flex flex-col gap-3">
              <Input
                value={editTask.title}
                onChange={(e) =>
                  setEditTask((p) => (p ? { ...p, title: e.target.value } : p))
                }
              />
              <Textarea
                value={editTask.note ?? ""}
                onChange={(e) =>
                  setEditTask((p) => (p ? { ...p, note: e.target.value } : p))
                }
              />
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                <Select
                  value={editTask.priority}
                  onValueChange={(v: Priority) =>
                    setEditTask((p) => (p ? { ...p, priority: v } : p))
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Priorität" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Keine Priorität</SelectItem>
                    <SelectItem value="low">Niedrig</SelectItem>
                    <SelectItem value="medium">Mittel</SelectItem>
                    <SelectItem value="high">Hoch</SelectItem>
                  </SelectContent>
                </Select>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="justify-start">
                      {editTask.dueAt
                        ? format(new Date(editTask.dueAt), "dd.MM.yyyy")
                        : "Fälligkeitsdatum"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={
                        editTask.dueAt ? new Date(editTask.dueAt) : undefined
                      }
                      onSelect={(d) =>
                        setEditTask((p) =>
                          p ? { ...p, dueAt: d ? d.toISOString() : null } : p
                        )
                      }
                      locale={de}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setEditTask(null)}>
                  Abbrechen
                </Button>
                <Button className="bg-black text-white" onClick={saveEdit}>
                  Speichern
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={createListOpen} onOpenChange={setCreateListOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Neue Liste</DialogTitle>
          </DialogHeader>
          <div className="flex items-center gap-2">
            <Input
              placeholder="Listenname"
              value={newListName}
              onChange={(e) => setNewListName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && createList()}
            />
            <Button className="bg-black text-white" onClick={createList}>
              Erstellen
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog
        open={!!renameListId}
        onOpenChange={() => {
          setRenameListId(null);
          setRenameListName("");
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Liste umbenennen</DialogTitle>
          </DialogHeader>
          <div className="flex items-center gap-2">
            <Input
              value={renameListName}
              onChange={(e) => setRenameListName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && renameList()}
            />
            <Button className="bg-black text-white" onClick={renameList}>
              Speichern
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
