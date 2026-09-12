# Le Petit Nicolas

One folder per component, one owner per folder. Stay in yours.

| Folder   | What                                                                    | Owner |
|----------|-------------------------------------------------------------------------|-------|
| `agent/` | The agent: runtime, tools, and its chat UI. Self-contained Next.js app. | 4     |
| `app/`   | Teacher web console.                                                    | 4     |
| `brain/` | Claude functions: checks, answer analysis, quiz, notes.                 | 2     |
| `io/`    | Telegram channel, phone mic, transcript ingest.                         | 1     |
| `data/`  | Supabase schema, repositories, Auth0.                                   | 3     |
| `landing/` | Landing page for judges: `/` in French, `/en` in English. Self-contained Next.js app on port 3001. | 4     |

## Run the agent

```bash
cd agent
cp .env.example .env
npm install
npm run dev
```

See [agent/README.md](agent/README.md).

## Run the landing page

```bash
cd landing
npm install
npm run dev
```

Copy lives in `landing/content.ts`; the contact and repository links are the constants at the top of
`landing/components/Landing.tsx`. Set `NEXT_PUBLIC_SITE_URL` on the host so social previews get absolute URLs.

## Database

The schema is applied and live. Before querying Supabase from any folder, read
[data/README.md](data/README.md) — RLS is on with no policies, so only the
server-side service role key can read or write.

## Demo
Link https://youtu.be/4yE0OucBuvs?si=lPADp2fJzRBTz4fg 
