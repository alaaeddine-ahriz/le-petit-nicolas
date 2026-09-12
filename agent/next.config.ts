import path from "node:path";
import { fileURLToPath } from "node:url";
import type { NextConfig } from "next";

const projectRoot = path.dirname(fileURLToPath(import.meta.url));

const nextConfig: NextConfig = {
  turbopack: { root: projectRoot },
  serverExternalPackages: [
    "@copilotkit/runtime",
    "@copilotkit/channels",
    "@copilotkit/channels-telegram",
    "@copilotkit/channels-ui",
    "exa-js",
  ],
};

export default nextConfig;
