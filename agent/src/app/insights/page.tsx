"use client";

import { CopilotChat } from "@copilotkit/react-core/v2";

export default function InsightsPage() {
  return (
    <main className="copilot-page">
      <CopilotChat agentId="insights" />
    </main>
  );
}
