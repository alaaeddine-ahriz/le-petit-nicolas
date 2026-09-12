-- Le Petit Nicolas — initial schema
-- Two layers, following the "raw log vs distilled profile" pattern:
--   RAW    = concepts_detected, quizzes, quiz_options, quiz_answers, teacher_interventions
--            (what actually happened, timestamped, never rewritten)
--   DISTILLED = student_concept_profile
--            (a living per-student summary, updated after each quiz — this is the
--             "memory that builds itself" the teacher queries in the CopilotKit chat)

create extension if not exists "pgcrypto";

-- ---------- Core entities ----------

create table teachers (
  id uuid primary key default gen_random_uuid(),
  auth0_user_id text not null unique,
  name text not null,
  email text,
  -- Telegram bot: /start lets a user declare "prof" or "élève". A teacher who
  -- claims that role in Telegram gets linked here (generate quizzes, view
  -- stats from chat) in addition to the Auth0-gated CopilotKit console.
  telegram_user_id bigint unique,
  telegram_chat_id bigint unique,
  onboarded_at timestamptz,
  created_at timestamptz not null default now()
);

create table classes (
  id uuid primary key default gen_random_uuid(),
  teacher_id uuid not null references teachers(id) on delete cascade,
  name text not null,           -- e.g. "5e3"
  subject text not null,        -- e.g. "Mathématiques"
  created_at timestamptz not null default now()
);

create table students (
  id uuid primary key default gen_random_uuid(),
  class_id uuid not null references classes(id) on delete cascade,
  first_name text not null,
  last_initial text,                     -- privacy: avoid storing full last name
  telegram_user_id bigint unique,        -- set once the student sends /start and picks "élève"
  telegram_chat_id bigint unique,        -- private chat id (usually == telegram_user_id)
  onboarded_at timestamptz,
  created_at timestamptz not null default now()
);

create table lessons (
  id uuid primary key default gen_random_uuid(),
  class_id uuid not null references classes(id) on delete cascade,
  teacher_id uuid not null references teachers(id) on delete cascade,
  title text,
  course_document_ref text,              -- pointer to the teacher's course doc
  status text not null default 'in_progress'
    check (status in ('in_progress', 'completed')),
  started_at timestamptz not null default now(),
  ended_at timestamptz
);

-- ---------- RAW layer ----------

create table lesson_transcript_chunks (
  id uuid primary key default gen_random_uuid(),
  lesson_id uuid not null references lessons(id) on delete cascade,
  text text not null,
  started_at_ms integer not null,        -- offset since lesson start
  ended_at_ms integer not null,
  created_at timestamptz not null default now()
);

create table concepts_detected (
  id uuid primary key default gen_random_uuid(),
  lesson_id uuid not null references lessons(id) on delete cascade,
  label text not null,                   -- e.g. "Addition de fractions"
  transcript_excerpt text not null,      -- the last ~3 min used to ground the quiz
  status text not null default 'detected'
    check (status in ('detected', 'check_proposed', 'check_sent', 'check_skipped')),
  detected_at timestamptz not null default now()
);

create table quizzes (
  id uuid primary key default gen_random_uuid(),
  concept_id uuid not null references concepts_detected(id) on delete cascade,
  question text not null,
  approved_by_teacher boolean not null default false,
  approved_at timestamptz,
  sent_at timestamptz,
  closes_at timestamptz
);

create table quiz_options (
  id uuid primary key default gen_random_uuid(),
  quiz_id uuid not null references quizzes(id) on delete cascade,
  label text not null,                   -- "A" | "B" | "C" | "D"
  text text not null,                    -- "2/6"
  is_correct boolean not null default false,
  misconception_label text                -- e.g. "additionne directement les dénominateurs"
);

create table quiz_answers (
  id uuid primary key default gen_random_uuid(),
  quiz_id uuid not null references quizzes(id) on delete cascade,
  student_id uuid not null references students(id) on delete cascade,
  option_id uuid not null references quiz_options(id) on delete cascade,
  answered_at timestamptz not null default now(),
  unique (quiz_id, student_id)
);

create table teacher_interventions (
  id uuid primary key default gen_random_uuid(),
  concept_id uuid not null references concepts_detected(id) on delete cascade,
  dominant_misconception text,
  suggested_intervention text,
  completed_at timestamptz not null default now()
);

create table lesson_summaries (
  id uuid primary key default gen_random_uuid(),
  lesson_id uuid not null references lessons(id) on delete cascade,
  notes_md text not null,
  recap_quiz_sent_at timestamptz
);

-- ---------- DISTILLED layer ----------

create table student_concept_profile (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references students(id) on delete cascade,
  concept_label text not null,
  mastery_level text not null default 'not_seen'
    check (mastery_level in ('not_seen', 'struggling', 'improving', 'mastered')),
  last_misconception text,
  times_seen integer not null default 0,
  times_correct integer not null default 0,
  first_seen_at timestamptz,
  last_seen_at timestamptz,
  updated_at timestamptz not null default now(),
  unique (student_id, concept_label)
);

-- ---------- Indexes ----------

create index on classes (teacher_id);
create index on students (class_id);
create index on lessons (class_id);
create index on concepts_detected (lesson_id);
create index on quizzes (concept_id);
create index on quiz_options (quiz_id);
create index on quiz_answers (quiz_id);
create index on quiz_answers (student_id);
create index on student_concept_profile (student_id);

-- ---------- Row-Level Security ----------
-- Enabled with NO policies, on purpose: the publishable/anon key can then read
-- and write nothing, and every access goes through the server with the service
-- role key (which bypasses RLS). Supabase enables this automatically on new
-- tables — stated explicitly here so this file matches the live database.
-- See SCHEMA.md "Access model" before adding policies or turning this off.

alter table teachers                 enable row level security;
alter table classes                  enable row level security;
alter table students                 enable row level security;
alter table lessons                  enable row level security;
alter table lesson_transcript_chunks enable row level security;
alter table concepts_detected        enable row level security;
alter table quizzes                  enable row level security;
alter table quiz_options             enable row level security;
alter table quiz_answers             enable row level security;
alter table teacher_interventions    enable row level security;
alter table lesson_summaries         enable row level security;
alter table student_concept_profile  enable row level security;
