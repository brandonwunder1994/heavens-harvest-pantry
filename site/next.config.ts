import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // The project sits inside the user's home folder, which is itself a git repo.
  // Pin the workspace root so Turbopack does not walk up and adopt it.
  turbopack: {
    root: __dirname,
  },
};

export default nextConfig;
