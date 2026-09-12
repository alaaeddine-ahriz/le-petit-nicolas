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

## Important: BuiltInAgent has no memory across separate requests

`BuiltInAgent`'s `threadId` does **not** make it remember previous turns on
its own. Each `POST /api/copilotkit/agent/<id>/run` is stateless — confirmed
directly: telling it a word in one request and asking for it back in a
second request on the same `threadId` gets "I don't have any memory of
that." Nothing server-side replays prior turns for you.

A browser `CopilotChat` client doesn't hit this because it keeps the full
message list locally and resends it every turn. Any other caller — like our
Telegram bridge (`src/telegram/updates-listener.ts`) — has to do the same:
keep a per-thread message log and pass the **entire history** in `messages`
on every request, not just the latest one. `conversationHistory` in that
file is the reference implementation.

One remaining gap even with that: history built this way only replays
plain user/assistant **text** turns, not the tool-call/tool-result payloads
from earlier turns. A value the agent only ever saw inside a tool result
(e.g. a `lessonId` from `list_lessons`) and never spoke aloud in its own
reply is invisible to it on a later turn — it can hallucinate a
placeholder instead of the real value. Tools that take such an ID as an
optional parameter should validate it and fall back gracefully (see
`propose_and_save_quiz`'s lessonId UUID check) rather than trusting it or
letting a bad value blow up a DB insert.

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
