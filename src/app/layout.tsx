import type { Metadata } from "next";
import type { ReactNode } from "react";
import { CopilotKitProvider } from "@copilotkit/react-core/v2";
import "@copilotkit/react-core/v2/styles.css";
import "./globals.css";

export const metadata: Metadata = {
  title: "Le Petit Nicolas",
  description: "CopilotKit built-in agent with Exa web tools",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>
        <CopilotKitProvider runtimeUrl="/api/copilotkit">
          {children}
        </CopilotKitProvider>
      </body>
    </html>
  );
}
