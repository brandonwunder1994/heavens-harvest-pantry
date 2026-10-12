import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  distDir: process.env.HHP_DIST_DIR || ".next",
  outputFileTracingIncludes: { "/owner/help/**": ["./private/handoff/founder-guide.pdf", "./private/handoff/*.png"] },
  // The project sits inside the user's home folder, which is itself a git repo.
  // Pin the workspace root so Turbopack does not walk up and adopt it.
  turbopack: {
    root: __dirname,
  },
  images: {
    qualities: [75, 90],
  },
  async redirects() {
    return [{
      source: "/:path*",
      has: [{ type: "host", value: "www.heavensharvestpantry.com" }],
      destination: "https://heavensharvestpantry.com/:path*",
      permanent: true,
    }];
  },
  async rewrites() {
    return [
      { source: "/mockorder/orders", destination: "/owner/mock" },
      { source: "/mockorder/:path*", destination: "/mock/:path*" },
    ];
  },
  async headers() {
    return [
      { source: "/mockorder/:path*", headers: [{ key: "Cache-Control", value: "private, no-store, max-age=0" }, { key: "X-Robots-Tag", value: "noindex, nofollow" }, { key: "Referrer-Policy", value: "no-referrer" }] },
      { source: "/mock/:path*", headers: [{ key: "Cache-Control", value: "private, no-store, max-age=0" }, { key: "X-Robots-Tag", value: "noindex, nofollow" }, { key: "Referrer-Policy", value: "no-referrer" }] },
      { source: "/api/mock/:path*", headers: [{ key: "Cache-Control", value: "private, no-store" }, { key: "X-Robots-Tag", value: "noindex, nofollow" }] },
      { source: "/order/thank-you", headers: [{ key: "Cache-Control", value: "private, no-store, max-age=0" }, { key: "Referrer-Policy", value: "no-referrer" }] },
      { source: "/owner/:path*", headers: [{ key: "Cache-Control", value: "private, no-store, max-age=0" }, { key: "X-Robots-Tag", value: "noindex, nofollow" }] },
      {
        source: "/qr.svg",
        headers: [{ key: "Cache-Control", value: "public, max-age=0, must-revalidate" }],
      },
      {
        source: "/qr-print.svg",
        headers: [{ key: "Cache-Control", value: "public, max-age=0, must-revalidate" }],
      },
      {
        source: "/kitchen-hd.jpg",
        headers: [{ key: "Cache-Control", value: "public, max-age=0, must-revalidate" }],
      },
      {
        source: "/jars/:path*",
        headers: [{ key: "Cache-Control", value: "public, max-age=0, must-revalidate" }],
      },
      {
        source: "/bags/:path*",
        headers: [{ key: "Cache-Control", value: "public, max-age=0, must-revalidate" }],
      },
    ];
  },
};

export default nextConfig;
