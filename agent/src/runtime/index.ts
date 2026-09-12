import { CopilotKitIntelligence, CopilotRuntime } from "@copilotkit/runtime/v2";
import { agent } from "@/agent";
import { insightsAgent } from "@/agent/insights";
import { lessonTrackerAgent } from "@/agent/lesson-tracker";
import { questionBuilderAgent } from "@/agent/question-builder";
import { telegramChannel } from "@/telegram";

const agents = {
  default: agent,
  lessonTracker: lessonTrackerAgent,
  insights: insightsAgent,
  mathQuiz: questionBuilderAgent,
};

const intelligenceApiKey =
  process.env.CPK_INTELLIGENCE_API_KEY ?? process.env.COPILOTKIT_API_KEY;

export const runtime = createRuntime();

function createRuntime() {
  if (telegramChannel && intelligenceApiKey) {
    return new CopilotRuntime({
      agents,
      intelligence: new CopilotKitIntelligence({ apiKey: intelligenceApiKey }),
      identifyUser: () => ({ id: "web-user", name: "Petit Nicolas" }),
      channels: [telegramChannel],
    });
  }

  if (telegramChannel && !intelligenceApiKey) {
    console.warn(
      "Telegram needs CPK_INTELLIGENCE_API_KEY; running web-only runtime.",
    );
  }

  return new CopilotRuntime({
    agents,
  });
}
