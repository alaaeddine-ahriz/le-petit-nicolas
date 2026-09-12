import { createCopilotRuntimeHandler } from "@copilotkit/runtime/v2";
import { runtime as copilotRuntime } from "@/runtime";

export const runtime = "nodejs";

const handler = createCopilotRuntimeHandler({
  runtime: copilotRuntime,
  basePath: "/api/copilotkit",
});

export {
  handler as GET,
  handler as POST,
  handler as PATCH,
  handler as PUT,
  handler as DELETE,
  handler as OPTIONS,
};
