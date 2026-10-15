import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // Node-specifieke/native modules buiten de server-bundle houden.
  serverExternalPackages: ["yahoo-finance2", "better-sqlite3"],
};

export default nextConfig;
