/* eslint-disable @typescript-eslint/no-explicit-any */
// next.config.ts
import withPWA from "next-pwa";
import type { RemotePattern } from "next/dist/shared/lib/image-config";

/**
 * ✅ Next.js 15 + next-pwa Setup
 *  • Offline-Caching mit Service Worker
 *  • Installierbar als PWA
 *  • Deaktiviert im Dev-Modus
 */

const remotePatterns: RemotePattern[] = [
  {
    protocol: "https",
    hostname: "qnotes-files.s3.eu-north-1.amazonaws.com",
    pathname: "**",
  },
];

const baseConfig = {
  images: { remotePatterns },
};

// 🩵 Wichtig: mit "as any" casten, um inkompatible Typen von next-pwa zu umgehen
// → Runtime bleibt unverändert, nur TS-Typen werden ignoriert.
const nextConfig = (
  withPWA({
    dest: "public",
    register: true,
    skipWaiting: true,
    disable: process.env.NODE_ENV === "development",
  }) as any
)(baseConfig);

export default nextConfig;
