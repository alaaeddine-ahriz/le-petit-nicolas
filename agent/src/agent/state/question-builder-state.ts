const MAX_REGENERATIONS = 2;

/**
 * A transcript segment as read by the Question Builder. Declared locally
 * (rather than imported from lesson-state) because this agent's confidence
 * field is optional per its own MEMORY.md, unlike the Lesson Tracker's.
 */
export interface TranscriptSegment {
  /** ISO 8601 timestamp of the segment. */
  timestamp: string;
  /** The transcribed text (French, teacher's voice only). */
  text: string;
  /** Confidence score from the transcription source (0.0-1.0), if available. */
  confidence?: number;
}

/** A single option in a proposed multiple-choice question. */
export interface QuestionOption {
  /** The answer text in French, using the teacher's notation. */
  text: string;
  /** True for the correct answer, false for all distractors. */
  isCorrect: boolean;
  /** Taxonomy ID of the misconception this option encodes. "CORRECT" for the correct answer. */
  misconceptionId: string;
  /** Short description of the cognitive error this option represents ("Correct answer" for the right one). */
  misconceptionDescription: string;
}

/** Reference to the concept a proposed question tests. */
export interface ConceptReference {
  /** The concept name, in French. */
  conceptName: string;
  /** The course document section this maps to, or null if off-document. */
  documentSection: string | null;
  /** Whether the concept was in the course document or teacher-created. */
  offDocument: boolean;
}

/** The current proposed multiple-choice question, matching question-builder MEMORY.md. */
export interface ProposedQuestion {
  /** The question text in French, using the teacher's notation and examples. */
  questionText: string;
  /** Exactly 4 options: 1 correct + 3 distractors. */
  options: QuestionOption[];
  /** Reference to the concept this question tests. */
  conceptReference: ConceptReference;
  /** The transcript excerpt this question was built from. */
  sourceTranscript: TranscriptSegment[];
  /** ISO 8601 timestamp when the question was generated. */
  generatedAt: string;
  /** Whether the example was taken verbatim from the transcript or synthesized. */
  exampleOrigin: "transcript" | "synthesized";
  /** Regeneration count: 0 = first proposal, 1 = first regen, 2 = second regen. */
  regenerationCount: number;
  /** Status of this proposal in the approval flow. */
  status: "proposed" | "approved" | "rejected" | "expired";
  /** Reason provided by the teacher on rejection, if any. */
  rejectionReason?: string;
}

/** Singleton mutable question-builder state. Single-teacher, single-question-at-a-time demo scope. */
export const questionBuilderState: {
  proposedQuestion: ProposedQuestion | null;
  regenerationCount: number;
} = {
  proposedQuestion: null,
  regenerationCount: 0,
};

export function resetQuestionBuilderState(): void {
  questionBuilderState.proposedQuestion = null;
  questionBuilderState.regenerationCount = 0;
}

/**
 * Enforces the hard constraints from SOUL.md: exactly 4 options, exactly one
 * correct answer marked "CORRECT", and 3 distractors with distinct
 * non-"CORRECT" misconception IDs. Throws a descriptive error on violation.
 */
export function validateProposedQuestion(options: QuestionOption[]): void {
  if (options.length !== 4) {
    throw new Error(`A proposed question must have exactly 4 options, got ${options.length}`);
  }

  const correct = options.filter((option) => option.isCorrect);
  if (correct.length !== 1) {
    throw new Error(`A proposed question must have exactly 1 correct option, got ${correct.length}`);
  }
  if (correct[0].misconceptionId !== "CORRECT") {
    throw new Error('The correct option must use misconceptionId "CORRECT"');
  }

  const distractors = options.filter((option) => !option.isCorrect);
  const distractorIds = distractors.map((option) => option.misconceptionId);
  if (distractorIds.some((id) => id === "CORRECT")) {
    throw new Error('A distractor cannot use misconceptionId "CORRECT"');
  }
  const uniqueIds = new Set(distractorIds);
  if (uniqueIds.size !== distractorIds.length) {
    throw new Error("Each distractor must map to a distinct misconceptionId — duplicates found");
  }
}

export { MAX_REGENERATIONS };
