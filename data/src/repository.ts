// The half of the flow that `agent/src/agent/tools/` doesn't cover.
//
// Juan's CopilotKit tools already handle capture → concept → quiz → 1:1 send →
// collect answers → aggregate by misconception. What had no code at all is what
// happens *after* the teacher reads the diagnosis: persisting the intervention,
// and folding the result into each student's running profile. Without that the
// "memory that builds itself" never builds, and the numbers vanish when the
// screen closes.
//
// Kept as plain functions rather than agent tools so `io/` and `brain/` can call
// them too.

import { db } from "./client";
import type { TelegramIdentity } from "./types";

function fail(context: string, error: { message: string } | null): never {
  throw new Error(`${context}: ${error?.message ?? "unknown error"}`);
}

type AnswerRow = {
  student_id: string;
  quiz_options: { is_correct: boolean; misconception_label: string | null } | null;
};

async function answersForQuiz(quizId: string): Promise<AnswerRow[]> {
  const { data, error } = await db()
    .from("quiz_answers")
    .select("student_id, quiz_options(is_correct, misconception_label)")
    .eq("quiz_id", quizId);

  if (error) fail("answersForQuiz", error);
  return data as unknown as AnswerRow[];
}

// ---------- Telegram poll ↔ quiz mapping ----------
//
// Must live in the database, not in a Map: `next dev` reloads on every file
// save, and a poll sent before a reload could no longer have its answers
// recorded — they arrived, failed to resolve, and were dropped silently.

/** Call once per student right after their poll is sent. */
export async function recordPollSend(input: {
  telegramPollId: string;
  quizId: string;
  studentId: string;
  /** quiz_options ids, in the exact order the options were sent to Telegram. */
  optionIds: string[];
}): Promise<void> {
  const { error } = await db().from("quiz_poll_sends").upsert(
    {
      telegram_poll_id: input.telegramPollId,
      quiz_id: input.quizId,
      student_id: input.studentId,
      option_ids: input.optionIds,
    },
    { onConflict: "telegram_poll_id" }
  );

  if (error) fail("recordPollSend", error);
}

/** Resolves an incoming poll_answer back to its quiz, student and options. */
export async function resolvePoll(
  telegramPollId: string
): Promise<{ quizId: string; studentId: string; optionIds: string[] } | null> {
  const { data, error } = await db()
    .from("quiz_poll_sends")
    .select("quiz_id, student_id, option_ids")
    .eq("telegram_poll_id", telegramPollId)
    .maybeSingle();

  if (error) fail("resolvePoll", error);
  if (!data) return null;

  return { quizId: data.quiz_id, studentId: data.student_id, optionIds: data.option_ids };
}

/** Records that a quiz actually went out — otherwise `sent_at` stays null forever. */
export async function markQuizSent(quizId: string, openForSeconds = 60): Promise<void> {
  const now = new Date();
  const { error } = await db()
    .from("quizzes")
    .update({
      sent_at: now.toISOString(),
      closes_at: new Date(now.getTime() + openForSeconds * 1000).toISOString(),
    })
    .eq("id", quizId);

  if (error) fail("markQuizSent", error);
}

// ---------- Student-facing: "pourquoi j'ai faux ?" ----------

export interface AnswerExplanation {
  studentFirstName: string;
  question: string;
  chosenOptionText: string;
  wasCorrect: boolean;
  /** The specific error the chosen distractor encodes — the heart of the explanation. */
  misconception: string | null;
  correctOptionText: string;
  conceptLabel: string;
  /** What the teacher actually said about this concept, to ground the explanation. */
  transcriptExcerpt: string;
  answeredAt: string;
}

/**
 * Everything needed to explain a student's most recent answer back to them.
 * Returns null if this Telegram user isn't a known student, or hasn't answered
 * anything yet.
 */
export async function getStudentLastAnswer(
  telegramUserId: number
): Promise<AnswerExplanation | null> {
  const { data: student } = await db()
    .from("students")
    .select("id, first_name")
    .eq("telegram_user_id", telegramUserId)
    .maybeSingle();

  if (!student) return null;

  const { data: answer, error } = await db()
    .from("quiz_answers")
    .select(
      "answered_at, quiz_id, quiz_options(text, is_correct, misconception_label), quizzes(question, concepts_detected(label, transcript_excerpt))"
    )
    .eq("student_id", student.id)
    .order("answered_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) fail("getStudentLastAnswer", error);
  if (!answer) return null;

  type Row = {
    answered_at: string;
    quiz_id: string;
    quiz_options: { text: string; is_correct: boolean; misconception_label: string | null } | null;
    quizzes: {
      question: string;
      concepts_detected: { label: string; transcript_excerpt: string } | null;
    } | null;
  };
  const row = answer as unknown as Row;

  // The correct option isn't on the answer row — it's whichever option of that
  // quiz is flagged correct.
  const { data: correct } = await db()
    .from("quiz_options")
    .select("text")
    .eq("quiz_id", row.quiz_id)
    .eq("is_correct", true)
    .maybeSingle();

  return {
    studentFirstName: student.first_name,
    question: row.quizzes?.question ?? "",
    chosenOptionText: row.quiz_options?.text ?? "",
    wasCorrect: Boolean(row.quiz_options?.is_correct),
    misconception: row.quiz_options?.misconception_label ?? null,
    correctOptionText: correct?.text ?? "",
    conceptLabel: row.quizzes?.concepts_detected?.label ?? "",
    transcriptExcerpt: row.quizzes?.concepts_detected?.transcript_excerpt ?? "",
    answeredAt: row.answered_at,
  };
}

// ---------- Closing the loop: the teacher's [DONE] ----------

/**
 * Persists the intervention and updates every answering student's profile.
 * Call this when the teacher acknowledges the diagnosis — it is the only thing
 * that writes `teacher_interventions` and `student_concept_profile`.
 */
export async function completeIntervention(input: {
  conceptId: string;
  quizId: string;
  suggestedIntervention?: string;
}): Promise<{ studentsUpdated: number; dominantMisconception: string | null }> {
  const { data: concept, error: conceptError } = await db()
    .from("concepts_detected")
    .select("label")
    .eq("id", input.conceptId)
    .single();

  if (conceptError) fail("completeIntervention concept", conceptError);

  const answers = await answersForQuiz(input.quizId);

  const wrongCounts = new Map<string, number>();
  for (const a of answers) {
    if (a.quiz_options?.is_correct) continue;
    const label = a.quiz_options?.misconception_label ?? null;
    if (!label) continue;
    wrongCounts.set(label, (wrongCounts.get(label) ?? 0) + 1);
  }
  const dominant =
    [...wrongCounts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? null;

  const { error: interventionError } = await db().from("teacher_interventions").insert({
    concept_id: input.conceptId,
    dominant_misconception: dominant,
    suggested_intervention: input.suggestedIntervention ?? null,
  });

  if (interventionError) fail("completeIntervention", interventionError);

  for (const a of answers) {
    const wasCorrect = Boolean(a.quiz_options?.is_correct);
    await updateStudentProfile({
      studentId: a.student_id,
      conceptLabel: concept.label,
      wasCorrect,
      misconception: wasCorrect ? null : a.quiz_options?.misconception_label ?? null,
    });
  }

  await db()
    .from("concepts_detected")
    .update({ status: "check_sent" })
    .eq("id", input.conceptId);

  return { studentsUpdated: answers.length, dominantMisconception: dominant };
}

async function updateStudentProfile(input: {
  studentId: string;
  conceptLabel: string;
  wasCorrect: boolean;
  misconception: string | null;
}): Promise<void> {
  const { data: existing } = await db()
    .from("student_concept_profile")
    .select("times_seen, times_correct, first_seen_at, last_misconception")
    .eq("student_id", input.studentId)
    .eq("concept_label", input.conceptLabel)
    .maybeSingle();

  const now = new Date().toISOString();
  const timesSeen = (existing?.times_seen ?? 0) + 1;
  const timesCorrect = (existing?.times_correct ?? 0) + (input.wasCorrect ? 1 : 0);

  // Deliberately simple and explainable to a teacher: a wrong answer means
  // struggling today whatever the history; mastery needs a track record.
  const mastery = !input.wasCorrect
    ? "struggling"
    : timesCorrect / timesSeen >= 0.8 && timesSeen >= 2
      ? "mastered"
      : "improving";

  const { error } = await db().from("student_concept_profile").upsert(
    {
      student_id: input.studentId,
      concept_label: input.conceptLabel,
      mastery_level: mastery,
      // Keep the last known misconception when they get it right, so the
      // history isn't erased by one good answer.
      last_misconception: input.misconception ?? existing?.last_misconception ?? null,
      times_seen: timesSeen,
      times_correct: timesCorrect,
      first_seen_at: existing?.first_seen_at ?? now,
      last_seen_at: now,
      updated_at: now,
    },
    { onConflict: "student_id,concept_label" }
  );

  if (error) fail("updateStudentProfile", error);
}

/** What the teacher's post-lesson chat queries: "comment va Karim en fractions ?" */
export async function getStudentProfile(studentId: string) {
  const { data, error } = await db()
    .from("student_concept_profile")
    .select("concept_label, mastery_level, last_misconception, times_seen, times_correct, last_seen_at")
    .eq("student_id", studentId)
    .order("last_seen_at", { ascending: false });

  if (error) fail("getStudentProfile", error);
  return data;
}

/** Class-wide view: who is struggling with what, for the end-of-lesson report. */
export async function getClassProfile(classId: string) {
  const { data, error } = await db()
    .from("student_concept_profile")
    .select("concept_label, mastery_level, last_misconception, students!inner(id, first_name, class_id)")
    .eq("students.class_id", classId)
    .order("concept_label");

  if (error) fail("getClassProfile", error);
  return data;
}

export async function saveLessonSummary(lessonId: string, notesMd: string): Promise<string> {
  const { data, error } = await db()
    .from("lesson_summaries")
    .insert({ lesson_id: lessonId, notes_md: notesMd })
    .select("id")
    .single();

  if (error) fail("saveLessonSummary", error);
  return data.id;
}

// ---------- Telegram /start: élève or prof ----------
//
// `sendPollToClass` skips any student without a telegram_chat_id, and nothing
// else in the repo ever sets one — so without this, a quiz reaches nobody.

/** Resolves an incoming Telegram user to a student or teacher, or null if not onboarded. */
export async function identifyTelegramUser(
  telegramUserId: number
): Promise<TelegramIdentity | null> {
  const { data: student } = await db()
    .from("students")
    .select("id, first_name")
    .eq("telegram_user_id", telegramUserId)
    .maybeSingle();

  if (student) return { role: "student", id: student.id, firstName: student.first_name };

  const { data: teacher } = await db()
    .from("teachers")
    .select("id, name")
    .eq("telegram_user_id", telegramUserId)
    .maybeSingle();

  if (teacher) return { role: "teacher", id: teacher.id, firstName: teacher.name };

  return null;
}

export async function claimStudent(input: {
  studentId: string;
  telegramUserId: number;
  telegramChatId: number;
}): Promise<void> {
  const { error } = await db()
    .from("students")
    .update({
      telegram_user_id: input.telegramUserId,
      telegram_chat_id: input.telegramChatId,
      onboarded_at: new Date().toISOString(),
    })
    .eq("id", input.studentId);

  if (error) fail("claimStudent", error);
}

export async function claimTeacher(input: {
  teacherId: string;
  telegramUserId: number;
  telegramChatId: number;
}): Promise<void> {
  const { error } = await db()
    .from("teachers")
    .update({
      telegram_user_id: input.telegramUserId,
      telegram_chat_id: input.telegramChatId,
      onboarded_at: new Date().toISOString(),
    })
    .eq("id", input.teacherId);

  if (error) fail("claimTeacher", error);
}

/** Students in a class who haven't linked Telegram yet — the names to offer on /start. */
export async function listUnclaimedStudents(classId: string) {
  const { data, error } = await db()
    .from("students")
    .select("id, first_name, last_initial")
    .eq("class_id", classId)
    .is("telegram_user_id", null)
    .order("first_name");

  if (error) fail("listUnclaimedStudents", error);
  return data;
}
