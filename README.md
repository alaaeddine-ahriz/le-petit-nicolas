# Le Petit Nicolas

One folder per component, one owner per folder. Stay in yours.

| Folder   | What                                                                    | Owner |
|----------|-------------------------------------------------------------------------|-------|
| `agent/` | The agent: runtime, tools, and its chat UI. Self-contained Next.js app. | 4     |
| `app/`   | Teacher web console.                                                    | 4     |
| `brain/` | Claude functions: checks, answer analysis, quiz, notes.                 | 2     |
| `io/`    | Telegram channel, phone mic, transcript ingest.                         | 1     |
| `data/`  | Supabase schema, repositories, Auth0.                                   | 3     |
| `landing/` | Landing page for judges. Self-contained Next.js app on port 3001 (`cd landing && npm run dev`). | 4     |

## Run the agent

```bash
cd agent
cp .env.example .env
npm install
npm run dev
```

See [agent/README.md](agent/README.md).

## Database

The schema is applied and live. Before querying Supabase from any folder, read
[data/README.md](data/README.md) — RLS is on with no policies, so only the
server-side service role key can read or write.
