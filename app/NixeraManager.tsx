"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";

export default function NixeraManager() {
  const pathname = usePathname();

  useEffect(() => {
    const WIDGET_SRC = "widget.nixera.net";

    const removeWidget = () => {
      const iframes = Array.from(document.querySelectorAll("iframe")).filter(
        (f) => (f as HTMLIFrameElement).src?.includes(WIDGET_SRC)
      );
      const buttons = document.querySelectorAll(
        "[data-nixera-widget-button], .nixera-widget-button, #nixera-widget-button"
      );
      iframes.forEach((f) => f.remove());
      buttons.forEach((b) => b.remove());
    };

    if (pathname === "/support") {
      // Nur auf /support laden, wenn noch nicht vorhanden
      if (!document.querySelector(`script[src*="${WIDGET_SRC}"]`)) {
        const s = document.createElement("script");
        s.src = `https://${WIDGET_SRC}/widget.js`;
        s.async = true;
        s.dataset.organizationId = "org_33LWlztfZOmd8G0iyxLZU1trI4x";
        document.body.appendChild(s);
      }
    } else {
      // Auf allen anderen Seiten entfernen
      removeWidget();
    }
  }, [pathname]);

  return null;
}
