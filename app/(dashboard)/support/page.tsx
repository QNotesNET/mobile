"use client";

import { useCallback, useMemo, useEffect } from "react";
import Script from "next/script";
import { usePathname } from "next/navigation";
import { Mail, MessageSquare, Phone, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Accordion,
  AccordionItem,
  AccordionTrigger,
  AccordionContent,
} from "@/components/ui/accordion";

/* ================================ Öffnungszeiten ================================ */
const OPENING_HOURS = {
  timezone: "Europe/Vienna",
  monFri: [{ start: "08:00", end: "17:30" }],
  sat: [{ start: "10:00", end: "14:00" }],
  sun: [] as { start: string; end: string }[],
};

function toMinutes(hhmm: string) {
  const [h, m] = hhmm.split(":").map(Number);
  return h * 60 + m;
}
function getNowInTZ(tz: string) {
  const now = new Date();
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: tz,
    weekday: "short",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(now);
  const get = (t: string) => parts.find((p) => p.type === t)?.value || "";
  const weekdayShort = get("weekday");
  const hour = parseInt(get("hour") || "0");
  const minute = parseInt(get("minute") || "0");
  return { weekdayShort, minutes: hour * 60 + minute };
}
function isOpenNow(cfg = OPENING_HOURS) {
  const { weekdayShort, minutes } = getNowInTZ(cfg.timezone);
  const map: Record<string, { start: string; end: string }[]> = {
    Mon: cfg.monFri,
    Tue: cfg.monFri,
    Wed: cfg.monFri,
    Thu: cfg.monFri,
    Fri: cfg.monFri,
    Sat: cfg.sat,
    Sun: cfg.sun,
  };
  const spans = map[weekdayShort] || [];
  return spans.some(
    (s) => minutes >= toMinutes(s.start) && minutes < toMinutes(s.end)
  );
}
function formatHours(cfg = OPENING_HOURS) {
  const fmt = (spans: { start: string; end: string }[]) =>
    spans.length
      ? spans.map((s) => `${s.start}–${s.end}`).join(", ")
      : "geschlossen";
  return {
    tz: cfg.timezone,
    monFri: fmt(cfg.monFri),
    sat: fmt(cfg.sat),
    sun: fmt(cfg.sun),
  };
}

/* ================================ Komponente ================================ */
export default function SupportKontakt() {
  const open = useMemo(() => isOpenNow(OPENING_HOURS), []);
  const hrs = useMemo(() => formatHours(OPENING_HOURS), []);
  const pathname = usePathname();

  /* --- Chat öffnen --- */
  const openChatbox = useCallback(() => {
    const tryClick = () => {
      const selectors = [
        "[data-nixera-widget-button]",
        "#nixera-widget-button",
        ".nixera-widget-button",
        '[data-widget="nixera"]',
        'button[aria-label*="Chat"]',
        'button[aria-label*="Support"]',
      ];
      for (const sel of selectors) {
        const el = document.querySelector(sel) as HTMLElement | null;
        if (el) {
          el.click();
          return true;
        }
      }
      const iframe = Array.from(document.querySelectorAll("iframe")).find((f) =>
        (f as HTMLIFrameElement).src?.includes("widget.nixera")
      ) as HTMLIFrameElement | undefined;
      if (iframe?.contentWindow) {
        iframe.contentWindow.postMessage({ type: "nixera:open" }, "*");
        return true;
      }
      return false;
    };
    if (!tryClick()) {
      const start = Date.now();
      const iv = setInterval(() => {
        if (tryClick() || Date.now() - start > 3000) clearInterval(iv);
      }, 200);
    }
  }, []);

  /* --- Widget laden / entfernen --- */
  useEffect(() => {
    const WIDGET_SRC = "https://widget.nixera.net/widget.js";

    if (pathname === "/support") {
      // Script einfügen (falls nicht vorhanden)
      if (!document.querySelector(`script[src="${WIDGET_SRC}"]`)) {
        const s = document.createElement("script");
        s.src = WIDGET_SRC;
        s.async = true;
        s.dataset.organizationId = "org_33LWlztfZOmd8G0iyxLZU1trI4x";
        document.body.appendChild(s);
      }
    } else {
      // Beim Verlassen: Widget & iframe entfernen
      const iframes = Array.from(document.querySelectorAll("iframe")).filter(
        (f) => (f as HTMLIFrameElement).src?.includes("widget.nixera")
      );
      iframes.forEach((f) => f.remove());

      const widgetButtons = document.querySelectorAll(
        "[data-nixera-widget-button], .nixera-widget-button, #nixera-widget-button"
      );
      widgetButtons.forEach((el) => el.remove());
    }
  }, [pathname]);

  /* ------------------------------ JSX ------------------------------ */
  return (
    <>
      <div className="mx-auto max-w-6xl px-4 py-8">
        <h1 className="text-2xl font-semibold">Kontakt & Hilfe</h1>
        <p className="mt-2 text-gray-600">
          So erreichst du uns – wähle E-Mail, Chat oder Telefon. Wir melden uns
          werktags schnell und helfen dir bei allen Fragen rund um Powerbook.
        </p>

        <div className="mt-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {/* E-Mail */}
          <Card>
            <CardHeader icon={<Mail className="h-5 w-5" />} title="E-Mail" />
            <CardBody>
              <p className="text-sm text-gray-600">
                Ideal für ausführliche Anfragen, Screenshots und Anhänge. Wir
                melden uns werktags schnellstmöglich.
              </p>
            </CardBody>
            <CardFooter>
              <Button
                className="w-full h-10 justify-between"
                onClick={() =>
                  (window.location.href = "mailto:support@powerbook.at")
                }
              >
                E-Mail schreiben
                <ChevronRight className="ml-2 h-4 w-4" />
              </Button>
            </CardFooter>
          </Card>

          {/* Support-Chat */}
          <Card>
            <CardHeader
              icon={<MessageSquare className="h-5 w-5" />}
              title="Support-Chat"
            />
            <CardBody>
              <p className="text-sm text-gray-600">
                Schnelle Hilfe direkt im Browser. Stelle Fragen, teile kurze
                Anliegen – wir helfen live, wenn möglich.
              </p>
            </CardBody>
            <CardFooter>
              <Button
                className="w-full h-10 justify-between"
                variant="secondary"
                onClick={openChatbox}
              >
                Chatbox öffnen
                <ChevronRight className="ml-2 h-4 w-4" />
              </Button>
            </CardFooter>
          </Card>

          {/* Telefon */}
          <Card>
            <CardHeader icon={<Phone className="h-5 w-5" />} title="Telefon" />
            <CardBody>
              <div
                className={`inline-flex items-center gap-2 rounded-full px-2.5 py-1 text-xs ring-1 ${
                  open
                    ? "bg-emerald-50 text-emerald-700 ring-emerald-200"
                    : "bg-gray-50 text-gray-700 ring-gray-200"
                }`}
              >
                <span
                  className={`inline-block h-2 w-2 rounded-full ${
                    open ? "bg-emerald-500" : "bg-gray-400"
                  }`}
                />
                {open ? "Aktuell geöffnet" : "Zurzeit geschlossen"}
              </div>
              <div className="mt-3 text-sm text-gray-700">
                <div className="text-xs uppercase tracking-wide text-gray-500 mb-1">
                  Öffnungszeiten ({hrs.tz})
                </div>
                <div className="space-y-0.5">
                  <div>Mo–Fr: {hrs.monFri}</div>
                  <div>Sa: {hrs.sat}</div>
                  <div>So: {hrs.sun}</div>
                </div>
              </div>
            </CardBody>
            <CardFooter>
              <Button
                className="w-full h-10 justify-between"
                onClick={() => (window.location.href = "tel:+43123456789")}
              >
                Jetzt anrufen
                <ChevronRight className="ml-2 h-4 w-4" />
              </Button>
            </CardFooter>
          </Card>
        </div>

        {/* FAQ */}
        <section className="mt-10 mb-16">
          <h2 className="text-xl font-semibold mb-1">FAQ</h2>
          <p className="text-sm text-gray-600 mb-3">
            Häufig gestellte Fragen findest du hier direkt beantwortet.
          </p>
          <div className="rounded-2xl border bg-white p-2 sm:p-4">
            <Accordion type="single" collapsible className="w-full">
              <AccordionItem value="faq-1" className="border-b">
                <AccordionTrigger className="text-left">
                  Wie schnell erhalte ich eine Antwort?
                </AccordionTrigger>
                <AccordionContent className="text-sm text-gray-600">
                  In der Regel reagieren wir innerhalb eines Werktages. Im
                  Support-Chat bekommst du – sofern verfügbar – sofort Hilfe.
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="faq-2" className="border-b">
                <AccordionTrigger className="text-left">
                  Welche Dateitypen kann ich anhängen?
                </AccordionTrigger>
                <AccordionContent className="text-sm text-gray-600">
                  Bilder (JPG/PNG), PDFs und kurze Videos sind willkommen. Bei
                  sehr großen Dateien schicke uns bitte zuerst eine kurze
                  Beschreibung – wir geben dir dann eine Upload-Option.
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="faq-3" className="border-b">
                <AccordionTrigger className="text-left">
                  Wie geht ihr mit meinen Daten um?
                </AccordionTrigger>
                <AccordionContent className="text-sm text-gray-600">
                  Wir verarbeiten Support-Daten ausschließlich zur Bearbeitung
                  deiner Anfrage. Details findest du in unserer
                  Datenschutzerklärung.
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          </div>
        </section>
      </div>
    </>
  );
}

/* ---------- Layout-Helfer ---------- */
function Card({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border bg-white p-5 shadow-sm flex flex-col min-h-[260px]">
      {children}
    </div>
  );
}
function CardHeader({ icon, title }: { icon: React.ReactNode; title: string }) {
  return (
    <div className="flex items-center gap-3 mb-3">
      <div className="h-9 w-9 rounded-full bg-black text-white flex items-center justify-center">
        {icon}
      </div>
      <div className="text-lg font-semibold">{title}</div>
    </div>
  );
}
function CardBody({ children }: { children: React.ReactNode }) {
  return <div className="text-sm flex-1">{children}</div>;
}
function CardFooter({ children }: { children: React.ReactNode }) {
  return <div className="mt-4">{children}</div>;
}
