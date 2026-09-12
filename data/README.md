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
- Backend code should use `SUPABASE_SERVICE_ROLE_KEY` (bypasses RLS). RLS is
  currently disabled repo-wide for hackathon speed — see the TODO in
  `SCHEMA.md` before any real deployment.
