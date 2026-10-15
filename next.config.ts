import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // yahoo-finance2 gebruikt Node-specifieke modules; laat het buiten de server-bundle.
  serverExternalPackages: ["yahoo-finance2"],
};

export default nextConfig;
