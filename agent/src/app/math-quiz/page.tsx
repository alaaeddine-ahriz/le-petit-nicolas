"use client";

import { CopilotChat } from "@copilotkit/react-core/v2";

export default function MathQuizPage() {
  return (
    <main className="copilot-page">
      <CopilotChat agentId="mathQuiz" />
    </main>
  );
}
