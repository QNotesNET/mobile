"use client";

import { useEffect, useState } from "react";
import { Plus, Mail, Phone, MapPin, Briefcase, Trash } from "lucide-react";
import Image from "next/image";
import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

type Contact = {
  _id?: string;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  street?: string;
  postalCode?: string;
  city?: string;
  country?: string;
  position?: string;
  company?: string;
  avatarUrl?: string;
};

export default function ContactsPage() {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [newContact, setNewContact] = useState<Partial<Contact>>({});

  // === FETCH CONTACTS ===
  useEffect(() => {
    (async () => {
      const res = await fetch("/api/contacts");
      const data = await res.json();
      setContacts(data.contacts || []);
      setLoading(false);
    })();
  }, []);

  // === CREATE CONTACT ===
  async function handleCreate() {
    if (!newContact.firstName || !newContact.lastName || !newContact.email)
      return;
    const res = await fetch("/api/contacts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(newContact),
    });
    if (res.ok) {
      const data = await res.json();
      setContacts((prev) => [data.contact, ...prev]);
      setNewContact({});
      setOpen(false);
    }
  }

  // === DELETE CONTACT ===
  async function handleDelete(id: string) {
    if (!confirm("Diesen Kontakt wirklich löschen?")) return;
    await fetch(`/api/contacts/${id}`, { method: "DELETE" });
    setContacts((prev) => prev.filter((c) => c._id !== id));
  }

  return (
    <div className="p-4 sm:p-6 max-w-6xl mx-auto">
      <div className="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <h1 className="text-2xl font-semibold">Kontakte</h1>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2 bg-black hover:bg-black/90 text-white">
              <Plus className="w-4 h-4" /> Kontakt erstellen
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-md max-h-[85vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Neuen Kontakt anlegen</DialogTitle>
              <DialogDescription>
                Gib die wichtigsten Informationen ein.
              </DialogDescription>
            </DialogHeader>

            <div className="grid gap-4 py-2 pb-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="flex flex-col gap-1">
                  <Label>Vorname</Label>
                  <Input
                    value={newContact.firstName || ""}
                    onChange={(e) =>
                      setNewContact({
                        ...newContact,
                        firstName: e.target.value,
                      })
                    }
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <Label>Nachname</Label>
                  <Input
                    value={newContact.lastName || ""}
                    onChange={(e) =>
                      setNewContact({ ...newContact, lastName: e.target.value })
                    }
                  />
                </div>
              </div>

              <div className="flex flex-col gap-1">
                <Label>E-Mail</Label>
                <Input
                  value={newContact.email || ""}
                  onChange={(e) =>
                    setNewContact({ ...newContact, email: e.target.value })
                  }
                />
              </div>

              <div className="flex flex-col gap-1">
                <Label>Telefon</Label>
                <Input
                  value={newContact.phone || ""}
                  onChange={(e) =>
                    setNewContact({ ...newContact, phone: e.target.value })
                  }
                />
              </div>

              <div className="flex flex-col gap-1">
                <Label>Straße</Label>
                <Input
                  value={newContact.street || ""}
                  onChange={(e) =>
                    setNewContact({ ...newContact, street: e.target.value })
                  }
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="flex flex-col gap-1">
                  <Label>PLZ</Label>
                  <Input
                    value={newContact.postalCode || ""}
                    onChange={(e) =>
                      setNewContact({
                        ...newContact,
                        postalCode: e.target.value,
                      })
                    }
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <Label>Stadt</Label>
                  <Input
                    value={newContact.city || ""}
                    onChange={(e) =>
                      setNewContact({ ...newContact, city: e.target.value })
                    }
                  />
                </div>
              </div>

              <div className="flex flex-col gap-1">
                <Label>Land</Label>
                <Input
                  value={newContact.country || ""}
                  onChange={(e) =>
                    setNewContact({ ...newContact, country: e.target.value })
                  }
                />
              </div>

              <div className="flex flex-col gap-1">
                <Label>Position</Label>
                <Input
                  value={newContact.position || ""}
                  onChange={(e) =>
                    setNewContact({ ...newContact, position: e.target.value })
                  }
                />
              </div>

              <div className="flex flex-col gap-1">
                <Label>Firma</Label>
                <Input
                  value={newContact.company || ""}
                  onChange={(e) =>
                    setNewContact({ ...newContact, company: e.target.value })
                  }
                />
              </div>
            </div>

            <DialogFooter>
              <Button
                onClick={handleCreate}
                className="bg-black text-white hover:bg-black/90"
              >
                Speichern
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {loading ? (
        <p className="text-gray-500">Lade Kontakte…</p>
      ) : contacts.length === 0 ? (
        <p className="text-gray-500">Keine Kontakte vorhanden.</p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {contacts.map((c) => (
            <Card
              key={c._id}
              className="overflow-hidden relative flex flex-col items-center pb-5"
            >
              <div className="absolute top-0 left-0 right-0 h-20 bg-black" />
              <div className="relative mt-10">
                <Image
                  src={c.avatarUrl || "/images/avatar-placeholder.png"}
                  alt={`${c.firstName} ${c.lastName}`}
                  width={90}
                  height={90}
                  className="rounded-full border-4 border-white shadow-md object-cover z-10 relative -mt-10"
                />
              </div>
              <CardContent className="mt-3 text-center space-y-2 w-full">
                <h2 className="text-lg font-semibold">
                  {c.firstName} {c.lastName}
                </h2>
                {c.position && (
                  <p className="text-sm text-gray-500">
                    <Briefcase className="inline-block w-4 h-4 mr-1 text-gray-400" />
                    {c.position} {c.company && `@ ${c.company}`}
                  </p>
                )}
                <div className="space-y-1 text-sm text-gray-700">
                  <p className="flex items-center justify-center gap-2">
                    <Mail className="w-4 h-4 text-gray-500" /> {c.email}
                  </p>
                  {c.phone && (
                    <p className="flex items-center justify-center gap-2">
                      <Phone className="w-4 h-4 text-gray-500" /> {c.phone}
                    </p>
                  )}
                  {(c.street || c.city || c.country) && (
                    <div className="flex flex-col items-center justify-center text-gray-600 mt-1">
                      <div className="flex items-center gap-2">
                        <MapPin className="w-4 h-4 text-gray-500" />
                        <span>
                          {[c.street, c.postalCode, c.city]
                            .filter(Boolean)
                            .join(", ")}
                        </span>
                      </div>
                      {c.country && <div>{c.country}</div>}
                    </div>
                  )}
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleDelete(c._id!)}
                  className="text-red-600 hover:bg-red-50 mt-2"
                >
                  <Trash className="w-4 h-4 mr-1" /> Löschen
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
