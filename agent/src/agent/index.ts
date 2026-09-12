import { BuiltInAgent } from "@copilotkit/runtime/v2";
import { searchWeb, extractUrl } from "@/agent/tools/exa";

export const agent = new BuiltInAgent({
  model: process.env.LLM_MODEL ?? "openai/inclusionai/ling-3.0-flash-vl:free",
  tools: [searchWeb, extractUrl],
  maxSteps: 5,
});
