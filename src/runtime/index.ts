import { CopilotRuntime } from "@copilotkit/runtime/v2";
import { agent } from "@/agent";

export const runtime = new CopilotRuntime({
  agents: { default: agent },
});
