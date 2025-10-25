/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardTitle } from "@/components/ui/card";
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
  ClipboardCopy,
  Settings,
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
  const [profileOpen, setProfileOpen] = useState(false);
  const [editContact, setEditContact] = useState<any | null>(null);
  const [shareOpen, setShareOpen] = useState(false);
  const [shareVCard, setShareVCard] = useState("");
  const [user, setUser] = useState<any | null>(null);
  const [avatarUrl, setAvatarUrl] = useState<string>("");

  // === FORM STATES ===
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

  const [profileForm, setProfileForm] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    street: "",
    postalCode: "",
    city: "",
    country: "",
    position: "",
    company: ""
  });

  // === BENUTZERLADELOGIK ===
  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/auth/me");
        if (res.ok) {
          const data = await res.json();
          setUser(data.user || null);
        }
      } catch {}
    })();
  }, []);

  // === AVATAR LADEN ===
  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/settings/profile");
        if (!res.ok) return;
        const data = await res.json();
        setAvatarUrl(data.avatarUrl || "");
      } catch {}
    })();
  }, []);

  const myContactUrl = user?.id
    ? `${
        process.env.NEXT_PUBLIC_APP_URL || "https://my.powerbook.at"
      }/contact/${user.id}`
    : "—";

  // === KONTAKTE LADEN ===
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

  // === MODAL KONTAKT ERSTELLEN/BEARBEITEN ===
  function openModal(contact?: any) {
    if (contact) {
      setEditContact(contact);
      setForm({ ...contact });
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
      setContacts((prev) =>
        editContact
          ? prev.map((c) => (c._id === editContact._id ? data.contact : c))
          : [data.contact, ...prev]
      );
      setOpen(false);
    } else {
      alert("Fehler beim Speichern");
    }
  }

  // === PROFIL LADEN/SPEICHERN ===
  async function loadProfile() {
    const res = await fetch("/api/user-contact-profile", { cache: "no-store" });
    if (res.ok) {
      const data = await res.json();
      if (data.profile) setProfileForm({ ...data.profile });
    }

    try {
      const resUser = await fetch("/api/user/info");
      if (resUser.ok) {
        const data = await resUser.json();
        if (data.user) {
          setProfileForm((prev) => ({
            ...prev,
            firstName: data.user.firstName || prev.firstName,
            lastName: data.user.lastName || prev.lastName,
          }));
        }
      }
    } catch {}
  }

  useEffect(() => {
    if (profileOpen) loadProfile();
  }, [profileOpen]);

  async function handleProfileSave() {
    const res = await fetch("/api/user-contact-profile", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(profileForm),
    });
    if (res.ok) {
      alert("Profil gespeichert!");
      setProfileOpen(false);
    } else {
      alert("Fehler beim Speichern.");
    }
  }

  // === KONTAKT LÖSCHEN ===
  async function handleDelete(id: string) {
    if (!confirm("Diesen Kontakt wirklich löschen?")) return;
    const res = await fetch(`/api/contacts/${id}`, { method: "DELETE" });
    if (res.ok) setContacts((prev) => prev.filter((c) => c._id !== id));
  }

  // === vCARD ERSTELLEN ===
  function showVCard(contact: any) {
    const vcard = [
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
    ]
      .filter(Boolean)
      .join("\n");

    setShareVCard(vcard);
    setShareOpen(true);
  }

  function copyToClipboard() {
    navigator.clipboard
      .writeText(shareVCard)
      .then(() => alert("vCard kopiert!"))
      .catch(() => alert("Fehler beim Kopieren"));
  }

  if (loading) return <p className="text-gray-500">Lade Kontakte…</p>;

  // === RENDER ===
  return (
    <div className="p-4">
      {/* Kopfbereich */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 mb-5">
        <h1 className="text-2xl font-semibold">Kontakte</h1>

        <div className="flex flex-col sm:flex-row sm:items-center gap-2 w-full md:w-auto">
          <Button
            onClick={() => setProfileOpen(true)}
            variant="outline"
            className="border-gray-400"
          >
            <Settings className="h-4 w-4 mr-2" />
            Mein Kontakt verwalten
          </Button>

          <div className="relative flex items-center sm:w-72">
            <Input
              value={myContactUrl}
              disabled
              className="bg-gray-100 text-gray-600 pr-10"
            />
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="absolute right-0 h-full w-10 hover:bg-gray-200"
              onClick={() => {
                navigator.clipboard
                  .writeText(myContactUrl)
                  .then(() => alert("Kontakt-URL kopiert"))
                  .catch(() => alert("Fehler beim Kopieren"));
              }}
            >
              <ClipboardCopy className="h-4 w-4 text-gray-700" />
            </Button>
          </div>

          <Button onClick={() => openModal()} className="bg-black text-white">
            <UserPlus className="h-4 w-4 mr-2" /> Kontakt erstellen
          </Button>
        </div>
      </div>

      {/* KONTAKT-KARTEN */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
        {contacts.length === 0 && (
          <p className="text-gray-500 text-sm col-span-full text-center">
            Noch keine Kontakte vorhanden.
          </p>
        )}
        {contacts.map((c) => (
          <Card
            key={c._id}
            className="overflow-hidden relative pb-4 border rounded-xl shadow-sm"
          >
            <div className="bg-black w-full h-24 absolute top-0 left-0" />
            <div className="absolute left-1/2 top-8 -translate-x-1/2">
              <img
                src="/images/avatar-fallback.png"
                alt={c.firstName}
                className="w-20 h-20 rounded-full border-4 border-white object-cover shadow"
              />
            </div>

            <CardContent className="pt-24 text-center text-gray-700">
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
                  onClick={() => showVCard(c)}
                  className="text-blue-600 hover:text-blue-800"
                >
                  <Download className="h-4 w-4 mr-1" /> In Kontakte speichern
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* MODAL: Kontakt erstellen/bearbeiten */}
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

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-4">
            <div>
              <Label>Vorname</Label>
              <Input
                value={form.firstName}
                onChange={(e) =>
                  setForm({ ...form, firstName: e.target.value })
                }
              />
            </div>
            <div>
              <Label>Nachname</Label>
              <Input
                value={form.lastName}
                onChange={(e) => setForm({ ...form, lastName: e.target.value })}
              />
            </div>
          </div>

          <div className="mt-3 space-y-3">
            <div>
              <Label>E-Mail</Label>
              <Input
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
              />
            </div>
            <div>
              <Label>Telefon</Label>
              <Input
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
              />
            </div>
            <div>
              <Label>Straße</Label>
              <Input
                value={form.street}
                onChange={(e) => setForm({ ...form, street: e.target.value })}
              />
            </div>

            <div className="grid grid-cols-3 gap-2">
              <div>
                <Label>PLZ</Label>
                <Input
                  value={form.postalCode}
                  onChange={(e) =>
                    setForm({ ...form, postalCode: e.target.value })
                  }
                />
              </div>
              <div className="col-span-2">
                <Label>Stadt</Label>
                <Input
                  value={form.city}
                  onChange={(e) => setForm({ ...form, city: e.target.value })}
                />
              </div>
            </div>

            <div>
              <Label>Land</Label>
              <Input
                value={form.country}
                onChange={(e) => setForm({ ...form, country: e.target.value })}
              />
            </div>

            <div>
              <Label>Firma</Label>
              <Input
                value={form.company}
                onChange={(e) => setForm({ ...form, company: e.target.value })}
              />
            </div>
            <div>
              <Label>Position</Label>
              <Input
                value={form.position}
                onChange={(e) => setForm({ ...form, position: e.target.value })}
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

      {/* MODAL: vCard */}
      <Dialog open={shareOpen} onOpenChange={setShareOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>vCard teilen oder kopieren</DialogTitle>
          </DialogHeader>
          <pre className="bg-gray-100 text-gray-800 text-sm rounded-md p-3 whitespace-pre-wrap overflow-x-auto max-h-60">
            {shareVCard}
          </pre>
          <DialogFooter>
            <Button
              onClick={copyToClipboard}
              className="bg-black text-white w-full"
            >
              <ClipboardCopy className="h-4 w-4 mr-2" /> Kopieren
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* MODAL: Profil */}
      <Dialog open={profileOpen} onOpenChange={setProfileOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Mein Kontaktprofil</DialogTitle>
            <DialogDescription>
              Aktualisiere deine persönlichen Kontaktinformationen.
            </DialogDescription>
          </DialogHeader>

          <div className="flex flex-col items-center mt-4">
            <div className="w-full h-24 bg-black rounded-t-lg relative">
              <img
                src={avatarUrl || user?.image || "/images/avatar-fallback.png"}
                alt="Profil"
                className="w-24 h-24 rounded-full border-4 border-white object-cover absolute left-1/2 top-12 -translate-x-1/2 shadow"
              />
            </div>
            <p className="text-lg font-semibold mt-16">
              {profileForm.firstName || "Vorname"}{" "}
              {profileForm.lastName || "Nachname"}
            </p>
          </div>

          <div className="mt-4 space-y-3">
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label>Vorname</Label>
                <Input
                  value={profileForm.firstName || ""}
                  onChange={(e) =>
                    setProfileForm({
                      ...profileForm,
                      firstName: e.target.value,
                    })
                  }
                />
              </div>
              <div>
                <Label>Nachname</Label>
                <Input
                  value={profileForm.lastName || ""}
                  onChange={(e) =>
                    setProfileForm({ ...profileForm, lastName: e.target.value })
                  }
                />
              </div>
            </div>

            <div>
              <Label>Position</Label>
              <Input
                value={profileForm.position || ""}
                onChange={(e) =>
                  setProfileForm({ ...profileForm, position: e.target.value })
                }
              />
            </div>

            <div>
              <Label>Firma</Label>
              <Input
                value={profileForm.company || ""}
                onChange={(e) =>
                  setProfileForm({ ...profileForm, company: e.target.value })
                }
              />
            </div>

            <div>
              <Label>E-Mail</Label>
              <Input
                value={profileForm.email || ""}
                onChange={(e) =>
                  setProfileForm({ ...profileForm, email: e.target.value })
                }
              />
            </div>

            <div>
              <Label>Telefon</Label>
              <Input
                value={profileForm.phone || ""}
                onChange={(e) =>
                  setProfileForm({ ...profileForm, phone: e.target.value })
                }
              />
            </div>

            <div>
              <Label>Straße</Label>
              <Input
                value={profileForm.street || ""}
                onChange={(e) =>
                  setProfileForm({ ...profileForm, street: e.target.value })
                }
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label>PLZ</Label>
                <Input
                  value={profileForm.postalCode || ""}
                  onChange={(e) =>
                    setProfileForm({
                      ...profileForm,
                      postalCode: e.target.value,
                    })
                  }
                />
              </div>
              <div>
                <Label>Stadt</Label>
                <Input
                  value={profileForm.city || ""}
                  onChange={(e) =>
                    setProfileForm({ ...profileForm, city: e.target.value })
                  }
                />
              </div>
            </div>

            <div>
              <Label>Land</Label>
              <Input
                value={profileForm.country || ""}
                onChange={(e) =>
                  setProfileForm({ ...profileForm, country: e.target.value })
                }
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              onClick={async () => {
                const payload = {
                  ...profileForm,
                  avatarUrl: avatarUrl || user?.image || "",
                };

                const res = await fetch("/api/user-contact-profile", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify(payload),
                });
                if (res.ok) {
                  alert("Profil gespeichert!");
                  setProfileOpen(false);
                } else {
                  alert("Fehler beim Speichern.");
                }
              }}
              className="bg-black text-white w-full mt-4"
            >
              Änderungen speichern
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
