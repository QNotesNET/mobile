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

  // --- Modal Form State ---
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

  // --- Fetch Kontakte ---
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

  // --- Öffnet Modal für Bearbeiten oder Neu ---
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

  // --- Speichern (POST oder PUT) ---
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

  // --- Als VCF speichern ---
function saveAsVCard(contact: any) {
  const lines = [
    "BEGIN:VCARD",
    "VERSION:3.0",
    `FN:${contact.firstName || ""} ${contact.lastName || ""}`,
    contact.phone ? `TEL;TYPE=CELL:${contact.phone}` : "",
    contact.email ? `EMAIL:${contact.email}` : "",
    contact.company ? `ORG:${contact.company}` : "",
    contact.position ? `TITLE:${contact.position}` : "",
    contact.street || contact.city || contact.country
      ? `ADR;TYPE=home:;;${contact.street || ""};${contact.city || ""};;${
          contact.postalCode || ""
        };${contact.country || ""}`
      : "",
    "END:VCARD",
  ].filter(Boolean);

  const vcardContent = lines.join("\n");
  const blob = new Blob([vcardContent], { type: "text/vcard;charset=utf-8" });
  const url = URL.createObjectURL(blob);

  // 📱 iOS/Android-safe Variante:
  const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);

  if (isMobile) {
    // Data-URL für mobile WebView öffnen
    const dataUrl =
      "data:text/vcard;charset=utf-8," + encodeURIComponent(vcardContent);
    window.open(dataUrl, "_blank");
  } else {
    // Normaler Desktop-Download
    const a = document.createElement("a");
    a.href = url;
    a.download = `${contact.firstName || "contact"}_${
      contact.lastName || ""
    }.vcf`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }
}


  if (loading) return <p className="text-gray-500">Lade Kontakte…</p>;

  return (
    <div className="p-4">
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-2xl font-semibold">Kontakte</h1>
        <Button onClick={() => openModal()} className="bg-black text-white">
          <UserPlus className="h-4 w-4 mr-2" /> Kontakt erstellen1
        </Button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
        {contacts.map((c) => (
          <Card key={c._id} className="overflow-hidden relative pt-0">
            {/* Schwarzer Balken – füllt oben komplett aus */}
            <div className="bg-black h-20 w-full" />

            {/* Profilbild – halb überlappend */}
            <div className="absolute left-1/2 top-10 transform -translate-x-1/2">
              <img
                src="/images/avatar-fallback.png"
                alt={c.firstName}
                className="w-20 h-20 rounded-full border-4 border-white object-cover"
              />
            </div>

            {/* Card Content */}
            <CardContent className="pt-10 text-center text-gray-700">
              <CardTitle className="text-lg mb-1">
                {c.firstName} {c.lastName}
              </CardTitle>
              <div className="flex flex-col gap-1 text-sm">
                {c.position && (
                  <div className="flex items-center justify-center gap-1">
                    <Building2 className="h-4 w-4" /> {c.position} @ {c.company}
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
                    {c.street}, {c.postalCode} {c.city}, {c.country}
                  </div>
                )}
              </div>

              <div className="flex justify-center gap-4 mt-3">
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
                  onClick={() => saveAsVCard(c)}
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
            <DialogDescription>
              Gib die wichtigsten Informationen über den Kontakt ein.
            </DialogDescription>
          </DialogHeader>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-3">
            <div>
              <Label className="mb-1.5 block">Vorname</Label>
              <Input
                value={form.firstName}
                onChange={(e) =>
                  setForm({ ...form, firstName: e.target.value })
                }
              />
            </div>
            <div>
              <Label className="mb-1.5 block">Nachname</Label>
              <Input
                value={form.lastName}
                onChange={(e) => setForm({ ...form, lastName: e.target.value })}
              />
            </div>
          </div>

          <div className="mt-2 space-y-3">
            <div>
              <Label className="mb-1.5 block">E-Mail</Label>
              <Input
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
              />
            </div>
            <div>
              <Label className="mb-1.5 block">Telefon</Label>
              <Input
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
              />
            </div>
            <div>
              <Label className="mb-1.5 block">Straße</Label>
              <Input
                value={form.street}
                onChange={(e) => setForm({ ...form, street: e.target.value })}
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              <div>
                <Label className="mb-1.5 block">PLZ</Label>
                <Input
                  value={form.postalCode}
                  onChange={(e) =>
                    setForm({ ...form, postalCode: e.target.value })
                  }
                />
              </div>
              <div>
                <Label className="mb-1.5 block">Stadt</Label>
                <Input
                  value={form.city}
                  onChange={(e) => setForm({ ...form, city: e.target.value })}
                />
              </div>
              <div>
                <Label className="mb-1.5 block">Land</Label>
                <Input
                  value={form.country}
                  onChange={(e) =>
                    setForm({ ...form, country: e.target.value })
                  }
                />
              </div>
            </div>

            <div>
              <Label className="mb-1.5 block">Position</Label>
              <Input
                value={form.position}
                onChange={(e) => setForm({ ...form, position: e.target.value })}
              />
            </div>
            <div>
              <Label className="mb-1.5 block">Firma</Label>
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
