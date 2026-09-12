# data/

Supabase schema, repositories, Auth0 — owned by Ayman.
Schema is applied and live. SQL: [migrations/0001_init.sql](migrations/0001_init.sql).

## ⚠️ Read this before querying Supabase

RLS is on for all 12 tables with **zero policies**, so the publishable/anon key
can't do anything: reads return `[]` with no error, writes fail with `42501`.
If a query "returns nothing" and you know the data is there, this is why.

Use the service role key, server-side only — in the Next.js app,
`agent/src/utils/supabase/admin.ts`. Never query Supabase from a client
component.

This is deliberate: nothing here needs browser-side DB access (Fathom ingest,
quiz generation, the Telegram bot and the CopilotKit runtime are all
server-side), so we skip wiring Auth0 JWTs into policies. It only rules out
Supabase Realtime from the browser — live teacher UI updates stream through
CopilotKit instead. Don't "fix" this by disabling RLS: the publishable key
ships in the browser bundle, so an open table exposes every student's record.

## Repository API

`agent/src/agent/tools/` (Juan) already covers capture → concept → quiz → 1:1
send → collect answers → aggregate by misconception. `data/src/repository.ts`
covers the half that had no code: what happens *after* the teacher reads the
diagnosis. Import from `agent/` via the `@data/*` alias.

```ts
import { completeIntervention, getStudentProfile, getClassProfile,
         identifyTelegramUser, claimStudent, listUnclaimedStudents } from "@data/repository";

// The teacher's [DONE] tap. The ONLY thing that writes teacher_interventions
// and student_concept_profile — skip it and the per-student memory never builds.
await completeIntervention({ conceptId, quizId, suggestedIntervention });
// → { studentsUpdated, dominantMisconception }

await getStudentProfile(studentId);   // "comment va Karim en fractions ?"
await getClassProfile(classId);       // who is struggling with what
```

**Telegram `/start`, élève or prof.** `sendPollToClass` skips any student
without a `telegram_chat_id`, and nothing else sets one — so until this is
wired, a quiz reaches nobody:

```ts
const who = await identifyTelegramUser(msg.from.id);   // → {role, id, firstName} | null
if (!who) {
  const names = await listUnclaimedStudents(classId);  // offer these as buttons
  await claimStudent({ studentId, telegramUserId, telegramChatId });
}
```

## The one design idea worth knowing

Two layers, because a score is not a memory:

- **Raw** — what happened, timestamped, never rewritten: `concepts_detected`,
  `quizzes`, `quiz_options`, `quiz_answers`, `teacher_interventions`,
  `lesson_summaries`, `lesson_transcript_chunks`.
- **Distilled** — `student_concept_profile`: a living per-student, per-concept
  summary (mastery level, last misconception, times seen/correct), upserted
  after every quiz. This is the "memory that builds itself", and what the
  teacher's post-lesson chat actually queries.

Without the split you can only report *how many* got it wrong. With it, the
agent says *what* they misunderstood, and how it's trending across lessons.

## How the flow maps to tables

Capture is post-call: Fathom joins the teacher's Google Meet, the transcript
only exists once the call ends. So steps 1-2 happen in batch after the lesson,
not live during it.

1. Call ends → transcript pulled via Fathom MCP → `lesson_transcript_chunks`.
2. Transcript segmented into concepts → one row each in `concepts_detected`
   (`transcript_excerpt` grounds that concept's quiz).
3. Teacher approves a check → `quizzes` + `quiz_options`, **each wrong option
   tagged with a `misconception_label`** — this is what makes diagnosis
   possible instead of just scoring.
4. Sent to each student's private Telegram chat (`students.telegram_chat_id`).
5. Each answer → one `quiz_answers` row (unique per `quiz_id` + `student_id`).
6. Answers aggregated by `misconception_label` → dominant misconception →
   suggested intervention shown to the teacher.
7. Teacher taps **[DONE]** → `teacher_interventions` row, **and**
   `student_concept_profile` upserted for everyone who answered.
8. End of lesson → `lesson_summaries` (notes + recap quiz).

## Telegram `/start`: élève or prof

The bot asks which role you are. **Élève** claims a `students` row, **prof**
claims a `teachers` row — both tables carry
`telegram_user_id`/`telegram_chat_id`/`onboarded_at`, so `io/` looks the
incoming user up in both to know which permissions apply.

## Setup

```bash
cp .env.example .env   # SUPABASE_URL, keys, DATABASE_URL
```

`DATABASE_URL` must use the **connection pooler** (`aws-0-eu-west-2.pooler…`),
not `db.<ref>.supabase.co` — the direct host is IPv6-only and unreachable from
most networks. To apply a migration, paste it into the Supabase SQL Editor or
run `supabase db push`.

## Open questions

- `concept_label` / `misconception_label` are free text. A `concepts` catalog
  table would give consistent naming across lessons, if Claude drifts.
- `telegram_chat_id` is null until `/start` — sending logic must skip
  not-yet-onboarded students and flag them to the teacher.
- How a teacher's `/start` links to their existing Auth0-created `teachers`
  row is undecided — needs a call with whoever builds `io/`.
- `io/` and `brain/` should read/write through this schema rather than
  inventing their own storage. Ping Ayman if something's missing.
