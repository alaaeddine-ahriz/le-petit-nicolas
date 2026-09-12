# Le Petit Nicolas

Next.js app that runs a **CopilotKit** built-in agent in the browser, with Exa tools for web search and URL extraction.

```
this Next.js process
├── src/runtime   CopilotRuntime (SSE, in-process threads)
├── src/agent     Built-in agent + Exa tools
└── src/app       CopilotChat UI + /api/copilotkit
```

## Requirements

- Node.js 22+
- OpenAI API key
- Exa API key ([dashboard.exa.ai](https://dashboard.exa.ai))
- Supabase keys — schema lives in [`../data`](../data)

## Setup

```bash
cp .env.example .env
# fill OPENAI_API_KEY and EXA_API_KEY
npm install
npm run dev
```

Supabase vars go in `.env.local` (`NEXT_PUBLIC_SUPABASE_URL`,
`NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, `SUPABASE_SERVICE_ROLE_KEY`).

## Talking to Supabase

The publishable key can't read or write anything (RLS) — use the service role
client, server-side only:

```ts
import { createAdminClient } from "@/utils/supabase/admin";

const supabase = createAdminClient();
const { data } = await supabase.from("students").select();
```

Why, and the schema itself: [`../data/README.md`](../data/README.md).

Open [http://localhost:3000](http://localhost:3000) and ask something current so the agent uses Exa search.

## Project layout

| File | Role |
| --- | --- |
| `src/agent/` | Built-in CopilotKit agent + Exa tools |
| `src/runtime/` | CopilotRuntime |
| `src/app/` | Next.js frontend (`CopilotChat`) |
| `src/app/api/copilotkit/` | Runtime HTTP endpoint |
| `src/utils/supabase/` | Supabase clients — use `admin.ts` (see above) |
| `src/middleware.ts` | Refreshes the Supabase auth session cookie |
| `.env` | Secrets (not committed) |
