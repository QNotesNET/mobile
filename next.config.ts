import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    // Variante A (moderner): remotePatterns
    remotePatterns: [
      {
        protocol: "https",
        hostname: "qnotes-files.s3.eu-north-1.amazonaws.com",
        pathname: "**", // alle Pfade erlauben
      },
      // falls ihr später ein CDN o.ä. nutzt, hier einfach weitere Hosts ergänzen:
      // { protocol: "https", hostname: "cdn.qnotes.app", pathname: "**" },
    ],

    // Variante B (alternativ/älter): domains
    // domains: ["qnotes-files.s3.eu-north-1.amazonaws.com"],
  },
};

export default nextConfig;
