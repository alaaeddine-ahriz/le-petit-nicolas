import { db } from "./client.js";
import type {
  ConceptInput,
  MisconceptionCount,
  QuizInput,
  QuizResults,
  TelegramIdentity,
  TranscriptChunkInput,
} from "./types.js";

function fail(context: string, error: { message: string } | null): never {
  throw new Error(`${context}: ${error?.message ?? "unknown error"}`);
}

// ---------- Lesson lifecycle ----------

export async function startLesson(input: {
  classId: string;
  teacherId: string;
  title?: string;
  courseDocumentRef?: string;
}): Promise<string> {
  const { data, error } = await db()
    .from("lessons")
    .insert({
      class_id: input.classId,
      teacher_id: input.teacherId,
      title: input.title ?? null,
      course_document_ref: input.courseDocumentRef ?? null,
    })
    .select("id")
    .single();

  if (error) fail("startLesson", error);
  return data.id;
}

export async function endLesson(lessonId: string): Promise<void> {
  const { error } = await db()
    .from("lessons")
    .update({ status: "completed", ended_at: new Date().toISOString() })
    .eq("id", lessonId);

  if (error) fail("endLesson", error);
}

/** Works for a live stream (chunk by chunk) or a Fathom transcript (all at once). */
export async function saveTranscriptChunks(
  lessonId: string,
  chunks: TranscriptChunkInput[]
): Promise<void> {
  if (chunks.length === 0) return;

  const { error } = await db().from("lesson_transcript_chunks").insert(
    chunks.map((c) => ({
      lesson_id: lessonId,
      text: c.text,
      started_at_ms: c.startedAtMs,
      ended_at_ms: c.endedAtMs,
    }))
  );

  if (error) fail("saveTranscriptChunks", error);
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

// ---------- Concepts & quizzes ----------

export async function saveConcept(lessonId: string, concept: ConceptInput): Promise<string> {
  const { data, error } = await db()
    .from("concepts_detected")
    .insert({
      lesson_id: lessonId,
      label: concept.label,
      transcript_excerpt: concept.transcriptExcerpt,
    })
    .select("id")
    .single();

  if (error) fail("saveConcept", error);
  return data.id;
}

/** Returns the quiz id plus a label→optionId map, so callers can record answers by letter. */
export async function saveQuiz(
  conceptId: string,
  quiz: QuizInput
): Promise<{ quizId: string; optionIds: Record<string, string> }> {
  const { data: quizRow, error: quizError } = await db()
    .from("quizzes")
    .insert({ concept_id: conceptId, question: quiz.question })
    .select("id")
    .single();

  if (quizError) fail("saveQuiz", quizError);

  const { data: optionRows, error: optionError } = await db()
    .from("quiz_options")
    .insert(
      quiz.options.map((o) => ({
        quiz_id: quizRow.id,
        label: o.label,
        text: o.text,
        is_correct: o.isCorrect,
        misconception_label: o.misconceptionLabel,
      }))
    )
    .select("id, label");

  if (optionError) fail("saveQuiz options", optionError);

  await db()
    .from("concepts_detected")
    .update({ status: "check_proposed" })
    .eq("id", conceptId);

  const optionIds: Record<string, string> = {};
  for (const row of optionRows) optionIds[row.label] = row.id;

  return { quizId: quizRow.id, optionIds };
}

/** Call once the teacher has approved and the quiz has gone out to students. */
export async function markQuizSent(quizId: string, openForSeconds = 60): Promise<void> {
  const now = new Date();
  const { error } = await db()
    .from("quizzes")
    .update({
      approved_by_teacher: true,
      approved_at: now.toISOString(),
      sent_at: now.toISOString(),
      closes_at: new Date(now.getTime() + openForSeconds * 1000).toISOString(),
    })
    .eq("id", quizId);

  if (error) fail("markQuizSent", error);
}

/** Upsert so a student changing their mind replaces their answer rather than erroring. */
export async function recordAnswer(input: {
  quizId: string;
  studentId: string;
  optionId: string;
}): Promise<void> {
  const { error } = await db()
    .from("quiz_answers")
    .upsert(
      { quiz_id: input.quizId, student_id: input.studentId, option_id: input.optionId },
      { onConflict: "quiz_id,student_id" }
    );

  if (error) fail("recordAnswer", error);
}

/**
 * The bit that makes the product work: groups wrong answers by the misconception
 * each distractor encodes, so the teacher is told *what* was misunderstood
 * rather than just how many got it wrong.
 */
export async function getQuizResults(quizId: string): Promise<QuizResults> {
  const { data, error } = await db()
    .from("quiz_answers")
    .select("student_id, quiz_options(is_correct, misconception_label)")
    .eq("quiz_id", quizId);

  if (error) fail("getQuizResults", error);

  type Row = {
    student_id: string;
    quiz_options: { is_correct: boolean; misconception_label: string | null } | null;
  };
  const rows = data as unknown as Row[];

  let correctCount = 0;
  const grouped = new Map<string, MisconceptionCount>();

  for (const row of rows) {
    if (row.quiz_options?.is_correct) {
      correctCount++;
      continue;
    }
    const label = row.quiz_options?.misconception_label ?? null;
    const key = label ?? "__unlabelled__";
    const entry = grouped.get(key) ?? { misconceptionLabel: label, count: 0, studentIds: [] };
    entry.count++;
    entry.studentIds.push(row.student_id);
    grouped.set(key, entry);
  }

  const breakdown = [...grouped.values()].sort((a, b) => b.count - a.count);

  return {
    totalAnswers: rows.length,
    correctCount,
    breakdown,
    dominant: breakdown[0] ?? null,
  };
}

// ---------- Closing the loop ----------

/**
 * What the teacher's [DONE] tap must call. Without this the intervention
 * vanishes when the screen closes and the per-student memory never builds.
 * Writes the intervention and folds this quiz into every answering student's
 * profile in one go.
 */
export async function completeIntervention(input: {
  conceptId: string;
  quizId: string;
  suggestedIntervention?: string;
}): Promise<void> {
  const results = await getQuizResults(input.quizId);

  const { data: concept, error: conceptError } = await db()
    .from("concepts_detected")
    .select("label")
    .eq("id", input.conceptId)
    .single();

  if (conceptError) fail("completeIntervention concept", conceptError);

  const { error: interventionError } = await db().from("teacher_interventions").insert({
    concept_id: input.conceptId,
    dominant_misconception: results.dominant?.misconceptionLabel ?? null,
    suggested_intervention: input.suggestedIntervention ?? null,
  });

  if (interventionError) fail("completeIntervention", interventionError);

  const { data: answers, error: answersError } = await db()
    .from("quiz_answers")
    .select("student_id, quiz_options(is_correct, misconception_label)")
    .eq("quiz_id", input.quizId);

  if (answersError) fail("completeIntervention answers", answersError);

  type Row = {
    student_id: string;
    quiz_options: { is_correct: boolean; misconception_label: string | null } | null;
  };

  for (const row of answers as unknown as Row[]) {
    await updateStudentProfile({
      studentId: row.student_id,
      conceptLabel: concept.label,
      wasCorrect: Boolean(row.quiz_options?.is_correct),
      misconception: row.quiz_options?.is_correct
        ? null
        : row.quiz_options?.misconception_label ?? null,
    });
  }

  await db()
    .from("concepts_detected")
    .update({ status: "check_sent" })
    .eq("id", input.conceptId);
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
  // struggling today, whatever the history; mastery needs a solid track record.
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

// ---------- Telegram /start: élève or prof ----------

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

/** Students in a class who haven't linked Telegram yet — show these on /start. */
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

/** Who a quiz actually goes out to. Students without Telegram are skipped. */
export async function listReachableStudents(classId: string) {
  const { data, error } = await db()
    .from("students")
    .select("id, first_name, telegram_chat_id")
    .eq("class_id", classId)
    .not("telegram_chat_id", "is", null);

  if (error) fail("listReachableStudents", error);
  return data as { id: string; first_name: string; telegram_chat_id: number }[];
}
