import { defineTool } from "@copilotkit/runtime/v2";
import { Exa } from "exa-js";
import { z } from "zod";

const EXTRACT_LIMIT = 30_000;

function exa() {
  const apiKey = process.env.EXA_API_KEY;
  if (!apiKey) {
    throw new Error("Missing EXA_API_KEY");
  }
  return new Exa(apiKey);
}

export const searchWeb = defineTool({
  name: "searchWeb",
  description:
    "Search the web for current information. Use the returned source URLs when citing results.",
  parameters: z.object({
    query: z.string().min(1).describe("The web search query"),
  }),
  execute: async ({ query }) => {
    const { results } = await exa().search(query, {
      type: "auto",
      numResults: 5,
      contents: { highlights: true },
    });

    return results.map((result) => ({
      title: result.title,
      url: result.url,
      publishedDate: result.publishedDate,
      highlights: result.highlights,
    }));
  },
});

export const extractUrl = defineTool({
  name: "extractUrl",
  description:
    "Read a web page's content from its URL. Returns up to 30,000 characters per page. Check failedResults and truncated, and cite the source URL.",
  parameters: z.object({
    url: z.string().url().describe("The public web page URL to read"),
  }),
  execute: async ({ url }) => {
    const data = await exa().getContents([url], {
      text: true,
      livecrawl: "preferred",
      livecrawlTimeout: 30_000,
    });

    return {
      results: data.results.map((result) => {
        const content = result.text ?? "";
        return {
          url: result.url,
          title: result.title,
          content: content.slice(0, EXTRACT_LIMIT),
          truncated: content.length > EXTRACT_LIMIT,
        };
      }),
      failedResults: (data.statuses ?? [])
        .filter((status) => status.status === "error")
        .map((status) => ({ url: status.id, error: status.status })),
    };
  },
});
