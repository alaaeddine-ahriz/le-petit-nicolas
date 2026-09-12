# Supabase Schema — Le Petit Nicolas

SQL: [migrations/0001_init.sql](migrations/0001_init.sql)

## Principle: raw log vs. distilled profile

Inspired by how Sofian's internal knowledge agent (`masterfile`) handles Fathom
transcripts: it never treats the raw transcript as the memory. It archives the
raw transcript, then extracts distilled, qualified facts into a cumulative
per-entity document (`customers/[client]/context.md`) that keeps getting
updated over time.

Same split here, entity is the **student** instead of the **client**:

- **RAW layer** — what actually happened, timestamped, never rewritten:
  `concepts_detected`, `quizzes`, `quiz_options`, `quiz_answers`,
  `teacher_interventions`, `lesson_summaries`.
- **DISTILLED layer** — `student_concept_profile`: a living per-student,
  per-concept summary (mastery level, last misconception, times seen/correct).
  This is what CopilotKit's post-lesson chat queries when the teacher asks
  "comment va Karim en fractions ?" — and it's the concrete implementation of
  the "per-student memory that builds itself" promised in the submission.

Without this split you can only ever report a score. With it, the agent can
say *what* a student or a class is struggling with, and how that's trending
across lessons.

## How the classroom flow maps to tables

> Capture is post-call (Fathom joins the teacher's Google Meet as a
> notetaker; the transcript is only available once the call ends — see
> PROJECT.md "Décision archi: capture via Fathom"). So step 1-2 below happen
> once, in batch, right after the lesson — not live, concept by concept,
> during it.

1. Call ends → agent pulls the full transcript via the Fathom MCP →
   segmented into chunks, saved to `lesson_transcript_chunks`.
2. Agent segments the transcript into concepts → one row per concept in
   `concepts_detected` (`transcript_excerpt` = the part of the transcript
   covering that concept, used to ground its quiz).
3. Teacher reviews the batch of proposed checks and taps **[ASK CLASS]** per
   concept (or approves all at once) → `quizzes` row created, `quiz_options`
   generated with Claude, **each wrong option tagged with a
   `misconception_label`** (this is what makes diagnosis possible later).
4. Quiz sent individually to each student's private Telegram chat
   (`students.telegram_chat_id`) → `quizzes.sent_at` set.
5. Each student's answer → one row in `quiz_answers` (unique per
   `quiz_id` + `student_id`).
6. After ~60s, backend aggregates `quiz_answers` grouped by
   `quiz_options.misconception_label` → dominant misconception → suggested
   intervention shown to teacher.
7. Teacher taps **[DONE]** → row written to `teacher_interventions`
   (this is what makes the intervention persist instead of disappearing when
   the screen closes), **and** `student_concept_profile` is upserted for every
   student who answered (increment `times_seen`/`times_correct`, update
   `last_misconception`, `mastery_level`).
8. End of lesson → `lesson_summaries` row (notes + recap quiz sent to class).

## Telegram role selection (`/start`)

The bot (`io/`) greets any new user with a slash command asking **"élève" ou
"prof"**:

- **Élève** → claims a row in `students` (sets `telegram_user_id` /
  `telegram_chat_id` / `onboarded_at`). Gets access to: the lessons/quizzes
  sent to them.
- **Prof** → claims a row in `teachers` (same three columns, added to that
  table for this). Gets access to: generating quizzes and viewing stats
  directly from Telegram, in addition to the Auth0-gated CopilotKit console.

Both tables carry `telegram_user_id`/`telegram_chat_id`/`onboarded_at` for
this reason — `io/` should look the incoming Telegram user up in both tables
to know which role (and which permissions) apply. How a teacher's Telegram
account gets matched to their existing `teachers` row (created via Auth0 on
the console) is still open — e.g. a one-time linking code shown in the
console, or the teacher being the one who invited the bot / owns the class.

## Access model: RLS on, service role only (decided)

**RLS is enabled on all 12 tables with zero policies** — Supabase turns it on
automatically for new tables, and the migration now makes that explicit so the
file and the live database agree. With no policies:

- the **publishable/anon key can do nothing** — reads return `[]` with no
  error, writes fail with `42501 new row violates row-level security policy`;
- the **`SUPABASE_SERVICE_ROLE_KEY` bypasses RLS** and works normally.

**So every DB access goes through the server with the service role key** — in
the Next.js app, `agent/src/utils/supabase/admin.ts`. Never query Supabase from
a client component; it will silently look empty.

We kept it this way on purpose. Nothing in this architecture needs browser-side
DB access — Fathom ingest, quiz generation, the Telegram bot and the CopilotKit
runtime are all server-side — so this costs us nothing and saves wiring Auth0
JWTs into RLS policies during a hackathon. The one thing it rules out is
Supabase Realtime from the browser; live teacher UI updates stream through
CopilotKit instead.

If this ever becomes a real product, the fix is policies scoped by `teacher_id`
(mapped from the Auth0 JWT) — **not** disabling RLS. The publishable key ships
inside the JS bundle, so an open table means anyone can read every student's
record.

## Not yet decided / TODO

- [ ] `concept_label` / `misconception_label` are free-text for now (fastest to
      ship). Consider a `concepts` catalog table later if we need consistent
      naming across lessons instead of relying on Claude to be consistent.
- [ ] `students.telegram_chat_id` is null until the student's onboarding
      `/start` — bot logic must handle "not yet onboarded" gracefully (e.g.
      skip that student when sending quizzes, flag it to the teacher).
- [ ] How a teacher's `/start` in Telegram gets matched to their existing
      `teachers` row (created via Auth0) isn't decided yet — needs a decision
      with whoever builds `io/`.
