"use client";

import { useState } from "react";
import { Plus, Mail, Phone, MapPin, Briefcase } from "lucide-react";
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
  id: string;
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
};

export default function ContactsPage() {
  const [contacts, setContacts] = useState<Contact[]>([
    {
      id: "1",
      firstName: "Anna",
      lastName: "Müller",
      email: "anna.mueller@example.com",
      phone: "+43 660 1234567",
      street: "Hauptstraße 42",
      postalCode: "1010",
      city: "Wien",
      country: "Österreich",
      position: "Marketing Managerin",
      company: "Preinfalk Media",
    },
  ]);

  const [open, setOpen] = useState(false);
  const [newContact, setNewContact] = useState<Partial<Contact>>({});

  function handleCreate() {
    if (!newContact.firstName || !newContact.lastName || !newContact.email)
      return;

    setContacts((prev) => [
      ...prev,
      {
        id: Math.random().toString(36).substring(2),
        firstName: newContact.firstName!,
        lastName: newContact.lastName!,
        email: newContact.email!,
        phone: newContact.phone || "",
        street: newContact.street || "",
        postalCode: newContact.postalCode || "",
        city: newContact.city || "",
        country: newContact.country || "",
        position: newContact.position || "",
        company: newContact.company || "",
      },
    ]);
    setNewContact({});
    setOpen(false);
  }

  return (
    <div className="p-4 sm:p-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <h1 className="text-2xl font-semibold">Kontakte</h1>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2 bg-black hover:bg-black/90 text-white">
              <Plus className="w-4 h-4" /> Kontakt erstellen
            </Button>
          </DialogTrigger>

          {/* Scrollbarer Inhalt */}
          <DialogContent className="sm:max-w-md max-h-[85vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Neuen Kontakt anlegen</DialogTitle>
              <DialogDescription>
                Gib die wichtigsten Informationen über den Kontakt ein.
              </DialogDescription>
            </DialogHeader>

            {/* Scroll-Inhalt mit Abstand */}
            <div className="grid gap-4 py-2 pb-6">
              {/* Vorname & Nachname */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="flex flex-col gap-1">
                  <Label htmlFor="firstName">Vorname</Label>
                  <Input
                    id="firstName"
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
                  <Label htmlFor="lastName">Nachname</Label>
                  <Input
                    id="lastName"
                    value={newContact.lastName || ""}
                    onChange={(e) =>
                      setNewContact({ ...newContact, lastName: e.target.value })
                    }
                  />
                </div>
              </div>

              <div className="flex flex-col gap-1">
                <Label htmlFor="email">E-Mail</Label>
                <Input
                  id="email"
                  type="email"
                  value={newContact.email || ""}
                  onChange={(e) =>
                    setNewContact({ ...newContact, email: e.target.value })
                  }
                />
              </div>

              <div className="flex flex-col gap-1">
                <Label htmlFor="phone">Telefon</Label>
                <Input
                  id="phone"
                  value={newContact.phone || ""}
                  onChange={(e) =>
                    setNewContact({ ...newContact, phone: e.target.value })
                  }
                />
              </div>

              {/* Adresse */}
              <div className="flex flex-col gap-1">
                <Label htmlFor="street">Straße</Label>
                <Input
                  id="street"
                  value={newContact.street || ""}
                  onChange={(e) =>
                    setNewContact({ ...newContact, street: e.target.value })
                  }
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="flex flex-col gap-1">
                  <Label htmlFor="postalCode">PLZ</Label>
                  <Input
                    id="postalCode"
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
                  <Label htmlFor="city">Stadt</Label>
                  <Input
                    id="city"
                    value={newContact.city || ""}
                    onChange={(e) =>
                      setNewContact({ ...newContact, city: e.target.value })
                    }
                  />
                </div>
              </div>

              <div className="flex flex-col gap-1">
                <Label htmlFor="country">Land</Label>
                <Input
                  id="country"
                  value={newContact.country || ""}
                  onChange={(e) =>
                    setNewContact({ ...newContact, country: e.target.value })
                  }
                />
              </div>

              <div className="flex flex-col gap-1">
                <Label htmlFor="position">Position</Label>
                <Input
                  id="position"
                  value={newContact.position || ""}
                  onChange={(e) =>
                    setNewContact({ ...newContact, position: e.target.value })
                  }
                />
              </div>

              <div className="flex flex-col gap-1">
                <Label htmlFor="company">Firma</Label>
                <Input
                  id="company"
                  value={newContact.company || ""}
                  onChange={(e) =>
                    setNewContact({ ...newContact, company: e.target.value })
                  }
                />
              </div>
            </div>

            <DialogFooter className="sticky bottom-0 bg-white pt-3 pb-2 border-t">
              <Button
                onClick={handleCreate}
                className="w-full sm:w-auto bg-black text-white hover:bg-black/90"
              >
                Speichern
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Kontaktliste */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
        {contacts.map((c) => (
          <Card
            key={c.id}
            className="overflow-hidden relative flex flex-col items-center pb-5"
          >
            <div className="absolute top-0 left-0 right-0 h-20 bg-black" />
            <div className="relative mt-10">
              <Image
                src="/images/avatar-placeholder.png"
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
                  <Mail className="w-4 h-4 text-gray-500" />
                  {c.email}
                </p>
                {c.phone && (
                  <p className="flex items-center justify-center gap-2">
                    <Phone className="w-4 h-4 text-gray-500" />
                    {c.phone}
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
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
