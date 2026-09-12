# data/

Supabase schema, repositories, and Auth0 — owned by Ayman.

```
data/
├── migrations/       SQL migrations, applied in order (0001, 0002, ...)
├── SCHEMA.md         entity reference + the raw-log vs. distilled-profile principle
└── .env.example      Supabase + Auth0 vars this folder needs
```

## Setup

```bash
cp .env.example .env
# fill SUPABASE_URL, SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY, DATABASE_URL
```

## Applying a migration

Paste the file's contents into the Supabase project's SQL Editor, or, if the
Supabase CLI is set up:

```bash
supabase db push
```

See [SCHEMA.md](SCHEMA.md) for what each table is for and how the classroom
flow (concept detected → quiz → answers → teacher intervention → per-student
profile) maps onto them.

## For the other folders

- `io/` and `brain/` should read/write through this schema (`quiz_answers`,
  `concepts_detected`, `student_concept_profile`, etc.) rather than inventing
  their own storage — ping Ayman if a table is missing something you need.

### ⚠️ Use the service role key, server-side only

RLS is **enabled on all 12 tables with zero policies**. That means the
publishable/anon key can't do anything: reads come back `[]` with no error,
writes fail with `42501 new row violates row-level security policy`. If your
Supabase query "returns nothing" and you're sure the data is there, this is why.

So: **every DB access goes through the server with
`SUPABASE_SERVICE_ROLE_KEY`**, which bypasses RLS. In the Next.js app, use
`agent/src/utils/supabase/admin.ts`. Never query Supabase from a client
component.

This is a deliberate call, not an oversight — nothing in this architecture
needs browser-side DB access (Fathom ingest, quiz generation, the Telegram bot
and the CopilotKit runtime are all server-side), so we get safety for free
rather than spending hackathon hours wiring Auth0 JWTs into RLS policies. The
live-updating teacher UI streams through CopilotKit, not Supabase Realtime.

Don't "fix" this by disabling RLS: the publishable key ships inside the browser
bundle, so an open table means anyone can read every student's record.
