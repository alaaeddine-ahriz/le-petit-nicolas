// Input shapes for the repository. Deliberately plain: `data/` must not import
// from `agent/`, so callers map their own domain objects into these.

export interface TranscriptChunkInput {
  text: string;
  /** Milliseconds since lesson start. */
  startedAtMs: number;
  endedAtMs: number;
}

export interface ConceptInput {
  label: string;
  /** The slice of transcript this concept's quiz is grounded in. */
  transcriptExcerpt: string;
}

export interface QuizOptionInput {
  label: "A" | "B" | "C" | "D";
  text: string;
  isCorrect: boolean;
  /**
   * The specific student error this distractor encodes, e.g. "additionne
   * directement les dénominateurs". Null for the correct option. Without it a
   * quiz can only be scored, never diagnosed — this is the whole point.
   */
  misconceptionLabel: string | null;
}

export interface QuizInput {
  question: string;
  options: QuizOptionInput[];
}

export interface MisconceptionCount {
  misconceptionLabel: string | null;
  count: number;
  studentIds: string[];
}

export interface QuizResults {
  totalAnswers: number;
  correctCount: number;
  /** Wrong answers grouped by the misconception they encode, commonest first. */
  breakdown: MisconceptionCount[];
  dominant: MisconceptionCount | null;
}

export type TelegramRole = "student" | "teacher";

export interface TelegramIdentity {
  role: TelegramRole;
  id: string;
  firstName: string;
}
