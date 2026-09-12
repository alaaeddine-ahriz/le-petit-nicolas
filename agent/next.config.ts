import path from "node:path";
import { fileURLToPath } from "node:url";
import type { NextConfig } from "next";

// One level up from agent/, so Turbopack can also trace imports into the
// sibling data/ package (@data/*) instead of just this directory.
const projectRoot = path.dirname(path.dirname(fileURLToPath(import.meta.url)));

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
