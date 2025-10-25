/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Building2,
  Mail,
  Phone,
  MapPin,
  Trash2,
  Edit2,
  Download,
  UserPlus,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";

export default function ContactsPage() {
  const [contacts, setContacts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [editContact, setEditContact] = useState<any | null>(null);

  const [form, setForm] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    street: "",
    postalCode: "",
    city: "",
    country: "",
    position: "",
    company: "",
  });

  // --- Kontakte laden ---
  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/contacts");
        if (!res.ok) throw new Error("Fetch failed");
        const data = await res.json();
        setContacts(data.contacts || []);
      } catch {
        setContacts([]);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  // --- Modal öffnen ---
  function openModal(contact?: any) {
    if (contact) {
      setEditContact(contact);
      setForm({
        firstName: contact.firstName || "",
        lastName: contact.lastName || "",
        email: contact.email || "",
        phone: contact.phone || "",
        street: contact.street || "",
        postalCode: contact.postalCode || "",
        city: contact.city || "",
        country: contact.country || "",
        position: contact.position || "",
        company: contact.company || "",
      });
    } else {
      setEditContact(null);
      setForm({
        firstName: "",
        lastName: "",
        email: "",
        phone: "",
        street: "",
        postalCode: "",
        city: "",
        country: "",
        position: "",
        company: "",
      });
    }
    setOpen(true);
  }

  // --- Speichern ---
  async function handleSave() {
    const method = editContact ? "PUT" : "POST";
    const url = editContact
      ? `/api/contacts/${editContact._id}`
      : "/api/contacts";

    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });

    if (res.ok) {
      const data = await res.json();
      setContacts((prev) => {
        if (editContact) {
          return prev.map((c) =>
            c._id === editContact._id ? data.contact : c
          );
        }
        return [data.contact, ...prev];
      });
      setOpen(false);
    } else {
      alert("Fehler beim Speichern");
    }
  }

  // --- Löschen ---
  async function handleDelete(id: string) {
    if (!confirm("Diesen Kontakt wirklich löschen?")) return;
    const res = await fetch(`/api/contacts/${id}`, { method: "DELETE" });
    if (res.ok) {
      setContacts((prev) => prev.filter((c) => c._id !== id));
    }
  }

  // --- vCard Download via API (funktioniert in WebView) ---
  function downloadVCard(contactId: string) {
    window.location.href = `/api/contact-vcard?id=${contactId}`;
  }

  if (loading) return <p className="text-gray-500">Lade Kontakte…</p>;

  return (
    <div className="p-4">
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-2xl font-semibold">Kontakte2</h1>
        <Button onClick={() => openModal()} className="bg-black text-white">
          <UserPlus className="h-4 w-4 mr-2" /> Kontakt erstellen
        </Button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
        {contacts.map((c) => (
          <Card
            key={c._id}
            className="overflow-hidden relative pb-4 border rounded-xl shadow-sm"
          >
            {/* Schwarzer Balken ganz oben */}
            <div className="bg-black w-full h-20 rounded-t-xl" />

            {/* Profilbild – halb überlappend */}
            <div className="absolute left-1/2 top-10 -translate-x-1/2">
              <img
                src="/images/avatar-fallback.png"
                alt={c.firstName}
                className="w-20 h-20 rounded-full border-4 border-white object-cover shadow"
              />
            </div>

            {/* Inhalt */}
            <CardContent className="pt-12 text-center text-gray-700">
              <CardTitle className="text-lg mb-1 font-semibold">
                {c.firstName} {c.lastName}
              </CardTitle>

              <div className="flex flex-col gap-1 text-sm text-gray-600">
                {c.position && (
                  <div className="flex items-center justify-center gap-1">
                    <Building2 className="h-4 w-4" />
                    {c.position} {c.company && `@ ${c.company}`}
                  </div>
                )}
                {c.email && (
                  <div className="flex items-center justify-center gap-1">
                    <Mail className="h-4 w-4" /> {c.email}
                  </div>
                )}
                {c.phone && (
                  <div className="flex items-center justify-center gap-1">
                    <Phone className="h-4 w-4" /> {c.phone}
                  </div>
                )}
                {(c.street || c.city || c.country) && (
                  <div className="flex items-center justify-center gap-1 text-center">
                    <MapPin className="h-4 w-4" />
                    {[c.street, c.postalCode, c.city, c.country]
                      .filter(Boolean)
                      .join(", ")}
                  </div>
                )}
              </div>

              {/* Buttons */}
              <div className="flex justify-center gap-3 mt-4 flex-wrap">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => openModal(c)}
                >
                  <Edit2 className="h-4 w-4 mr-1" /> Bearbeiten
                </Button>
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => handleDelete(c._id)}
                >
                  <Trash2 className="h-4 w-4 mr-1" /> Löschen
                </Button>
              </div>

              <div className="mt-2 flex justify-center">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => downloadVCard(c._id)}
                  className="text-blue-600 hover:text-blue-800"
                >
                  <Download className="h-4 w-4 mr-1" /> In Kontakte speichern
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Modal */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editContact ? "Kontakt bearbeiten" : "Neuen Kontakt anlegen"}
            </DialogTitle>
            <DialogDescription className="text-gray-500">
              Gib die wichtigsten Informationen über den Kontakt ein.
            </DialogDescription>
          </DialogHeader>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-4">
            <div>
              <Label className="mb-2 block">Vorname</Label>
              <Input
                value={form.firstName}
                onChange={(e) =>
                  setForm({ ...form, firstName: e.target.value })
                }
              />
            </div>
            <div>
              <Label className="mb-2 block">Nachname</Label>
              <Input
                value={form.lastName}
                onChange={(e) => setForm({ ...form, lastName: e.target.value })}
              />
            </div>
          </div>

          <div className="mt-3 space-y-3">
            <div>
              <Label className="mb-2 block">E-Mail</Label>
              <Input
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
              />
            </div>
            <div>
              <Label className="mb-2 block">Telefon</Label>
              <Input
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
              />
            </div>
            <div>
              <Label className="mb-2 block">Straße</Label>
              <Input
                value={form.street}
                onChange={(e) => setForm({ ...form, street: e.target.value })}
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              <div>
                <Label className="mb-2 block">PLZ</Label>
                <Input
                  value={form.postalCode}
                  onChange={(e) =>
                    setForm({ ...form, postalCode: e.target.value })
                  }
                />
              </div>
              <div>
                <Label className="mb-2 block">Stadt</Label>
                <Input
                  value={form.city}
                  onChange={(e) => setForm({ ...form, city: e.target.value })}
                />
              </div>
              <div>
                <Label className="mb-2 block">Land</Label>
                <Input
                  value={form.country}
                  onChange={(e) =>
                    setForm({ ...form, country: e.target.value })
                  }
                />
              </div>
            </div>

            <div>
              <Label className="mb-2 block">Position</Label>
              <Input
                value={form.position}
                onChange={(e) => setForm({ ...form, position: e.target.value })}
              />
            </div>
            <div>
              <Label className="mb-2 block">Firma</Label>
              <Input
                value={form.company}
                onChange={(e) => setForm({ ...form, company: e.target.value })}
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              onClick={handleSave}
              className="bg-black text-white w-full mt-4"
            >
              Speichern
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
