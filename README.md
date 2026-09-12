# Le Petit Nicolas

One folder per component, one owner per folder. Stay in yours.

| Folder   | What                                                                    | Owner |
|----------|-------------------------------------------------------------------------|-------|
| `agent/` | The agent: runtime, tools, and its chat UI. Self-contained Next.js app. | 4     |
| `app/`   | Teacher web console.                                                    | 4     |
| `brain/` | Claude functions: checks, answer analysis, quiz, notes.                 | 2     |
| `io/`    | Telegram channel, phone mic, transcript ingest.                         | 1     |
| `data/`  | Supabase schema, repositories, Auth0.                                   | 3     |

## Run the agent

```bash
cd agent
cp .env.example .env
npm install
npm run dev
```

See [agent/README.md](agent/README.md).
