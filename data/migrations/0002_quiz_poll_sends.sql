-- Durable Telegram poll → quiz mapping.
--
-- This lived in a `new Map()` inside the Node process (telegram.ts pollRegistry),
-- so every `next dev` reload lost it: the poll still reached the student, but
-- their answer arrived with a poll_id nobody could resolve and was dropped with
-- a console.warn. That's why quiz_answers stayed at 0 while polls were visibly
-- being received.
--
-- One row per student per send, because the fan-out is 1:1 — each student's poll
-- gets its own Telegram poll id.

create table quiz_poll_sends (
  telegram_poll_id text primary key,
  quiz_id uuid not null references quizzes(id) on delete cascade,
  student_id uuid not null references students(id) on delete cascade,
  -- quiz_options ids in the exact order the options were sent to Telegram, so
  -- poll_answer.option_ids[i] resolves without assuming any label ordering.
  option_ids uuid[] not null,
  sent_at timestamptz not null default now()
);

create index on quiz_poll_sends (quiz_id);
create index on quiz_poll_sends (student_id);

alter table quiz_poll_sends enable row level security;
