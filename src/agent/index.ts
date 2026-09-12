import { BuiltInAgent } from "@copilotkit/runtime/v2";
import { searchWeb, extractUrl } from "@/agent/tools/exa";

export const agent = new BuiltInAgent({
  model: process.env.OPENAI_MODEL ?? "openai:gpt-4.1-mini",
  tools: [searchWeb, extractUrl],
  maxSteps: 5,
});
