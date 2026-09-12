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

## Setup

```bash
cp .env.example .env
# fill OPENAI_API_KEY and EXA_API_KEY
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) and ask something current so the agent uses Exa search.

## Project layout

| File | Role |
| --- | --- |
| `src/agent/` | Built-in CopilotKit agent + Exa tools |
| `src/runtime/` | CopilotRuntime |
| `src/app/` | Next.js frontend (`CopilotChat`) |
| `src/app/api/copilotkit/` | Runtime HTTP endpoint |
| `.env` | Secrets (not committed) |
