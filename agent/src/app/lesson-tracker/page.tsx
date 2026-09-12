"use client";

import { CopilotChat } from "@copilotkit/react-core/v2";

export default function LessonTrackerPage() {
  return (
    <main className="copilot-page">
      <CopilotChat agentId="lessonTracker" />
    </main>
  );
}
