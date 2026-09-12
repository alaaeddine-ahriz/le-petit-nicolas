import { CopilotRuntime } from "@copilotkit/runtime/v2";
import { agent } from "@/agent";
import { lessonTrackerAgent } from "@/agent/lesson-tracker";
import { insightsAgent } from "@/agent/insights";

export const runtime = new CopilotRuntime({
  agents: { default: agent, lessonTracker: lessonTrackerAgent, insights: insightsAgent },
});
