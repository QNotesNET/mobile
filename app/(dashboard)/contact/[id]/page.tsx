/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import L from "leaflet";
import { Mail, Phone, MapPin } from "lucide-react";

const markerIcon = new L.Icon({
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
});

export default function ContactPage() {
  const params = useParams();
  const id = params?.id as string;
  const [profile, setProfile] = useState<any | null>(null);
  const [coords, setCoords] = useState<[number, number] | null>(null);
  const [loading, setLoading] = useState(true);

  // --- Profil laden ---
  useEffect(() => {
    (async () => {
      try {
        const res = await fetch(`/api/contact/${id}`);
        if (!res.ok) throw new Error("Profile not found");
        const data = await res.json();
        setProfile(data.profile || null);

        // Adresse in Koordinaten umwandeln (OpenStreetMap Nominatim API)
        if (data.profile && data.profile.street) {
          const address = `${data.profile.street}, ${
            data.profile.postalCode || ""
          } ${data.profile.city || ""}, ${data.profile.country || ""}`;
          const query = encodeURIComponent(address);
          const geoRes = await fetch(
            `https://nominatim.openstreetmap.org/search?format=json&q=${query}`
          );
          const geoData = await geoRes.json();
          if (geoData && geoData[0]) {
            setCoords([parseFloat(geoData[0].lat), parseFloat(geoData[0].lon)]);
          }
        }
      } catch (err) {
        console.error(err);
        setProfile(null);
      } finally {
        setLoading(false);
      }
    })();
  }, [id]);

  if (loading)
    return <p className="text-center text-gray-500 mt-10">Lade Profil…</p>;
  if (!profile)
    return (
      <p className="text-center text-gray-500 mt-10">Profil nicht gefunden.</p>
    );

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center pb-10">
      {/* Header */}
      <div className="relative w-full h-40 bg-black flex justify-center items-end pb-10">
        <img
          src={profile.avatarUrl || "/images/avatar-fallback.png"}
          alt="Profil"
          className="w-28 h-28 rounded-full border-4 border-white object-cover absolute bottom-[-2.5rem]"
        />
      </div>

      <div className="mt-16 text-center px-4 max-w-lg w-full">
        <h1 className="text-2xl font-semibold text-gray-900">
          {profile.firstName} {profile.lastName}
        </h1>
        {profile.position && (
          <p className="text-gray-500 mt-1">{profile.position}</p>
        )}
        {profile.company && <p className="text-gray-500">{profile.company}</p>}
      </div>

      {/* Kontaktinfo */}
      <div className="mt-6 bg-white rounded-xl shadow-md p-5 w-[90%] max-w-md">
        <h2 className="text-lg font-semibold mb-3 text-gray-800">
          Kontaktinfo
        </h2>
        <div className="flex flex-col gap-2 text-gray-700 text-sm">
          {profile.phone && (
            <div className="flex items-center gap-2">
              <Phone className="w-4 h-4 text-gray-500" />
              <a href={`tel:${profile.phone}`} className="hover:underline">
                {profile.phone}
              </a>
            </div>
          )}
          {profile.email && (
            <div className="flex items-center gap-2">
              <Mail className="w-4 h-4 text-gray-500" />
              <a href={`mailto:${profile.email}`} className="hover:underline">
                {profile.email}
              </a>
            </div>
          )}
        </div>
      </div>

      {/* Adresse */}
      {(profile.street || profile.city || profile.country) && (
        <div className="mt-6 bg-white rounded-xl shadow-md p-5 w-[90%] max-w-md">
          <h2 className="text-lg font-semibold mb-3 text-gray-800">Adresse</h2>
          <div className="flex items-start gap-2 text-sm text-gray-700">
            <MapPin className="w-4 h-4 text-gray-500 mt-[2px]" />
            <div>
              {[profile.street, profile.postalCode, profile.city]
                .filter(Boolean)
                .join(", ")}
              <br />
              {profile.country}
            </div>
          </div>

          {/* --- MAP --- */}
          <div className="mt-4 w-full h-56 rounded-lg overflow-hidden bg-gray-100 flex items-center justify-center">
            {!coords ? (
              <p className="text-gray-400 text-sm">Lade Karte…</p>
            ) : (
              <MapContainer
                key={`${coords[0]}-${coords[1]}`} // forces rerender when coords change
                center={coords}
                zoom={13}
                scrollWheelZoom={false}
                style={{ height: "100%", width: "100%" }}
                className="z-0"
              >
                <TileLayer
                  url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                  attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                />
                <Marker position={coords} icon={markerIcon}>
                  <Popup>
                    {profile.firstName} {profile.lastName}
                  </Popup>
                </Marker>
              </MapContainer>
            )}
          </div>
        </div>
      )}

      {/* Save Contact */}
      <button
        onClick={() => {
          const vcard = [
            "BEGIN:VCARD",
            "VERSION:3.0",
            `FN:${profile.firstName || ""} ${profile.lastName || ""}`,
            profile.phone ? `TEL;TYPE=CELL:${profile.phone}` : "",
            profile.email ? `EMAIL:${profile.email}` : "",
            profile.company ? `ORG:${profile.company}` : "",
            profile.position ? `TITLE:${profile.position}` : "",
            profile.street || profile.city || profile.country
              ? `ADR;TYPE=home:;;${profile.street || ""};${
                  profile.city || ""
                };;${profile.postalCode || ""};${profile.country || ""}`
              : "",
            "END:VCARD",
          ]
            .filter(Boolean)
            .join("\n");

          const blob = new Blob([vcard], { type: "text/vcard" });
          const link = document.createElement("a");
          link.href = URL.createObjectURL(blob);
          link.download = `${profile.firstName || "contact"}.vcf`;
          link.click();
        }}
        className="mt-8 bg-black text-white px-8 py-3 rounded-lg text-sm font-medium shadow hover:bg-gray-800"
      >
        Kontakt speichern
      </button>

      <p className="text-xs text-gray-400 mt-4">
        © {new Date().getFullYear()} Powerbook
      </p>
    </div>
  );
}
