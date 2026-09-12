import { defineTool } from "@copilotkit/runtime/v2";
import { z } from "zod";
import {
  MAX_REGENERATIONS,
  questionBuilderState,
  validateProposedQuestion,
  type QuestionOption,
} from "@/agent/state/question-builder-state";

const questionOptionSchema = z.object({
  text: z.string().min(1).describe("The answer text in French, using the teacher's notation"),
  isCorrect: z.boolean().describe("True for the correct answer, false for all distractors"),
  misconceptionId: z
    .string()
    .min(1)
    .describe('Taxonomy ID this option encodes ("CORRECT" for the right answer, e.g. "FRAC-001" for a distractor)'),
  misconceptionDescription: z
    .string()
    .min(1)
    .describe('Short description of the cognitive error ("Correct answer" for the right one)'),
});

const conceptReferenceSchema = z.object({
  conceptName: z.string().min(1).describe("The concept name, in French"),
  documentSection: z.string().nullable().describe("Course document section this maps to, or null if off-document"),
  offDocument: z.boolean().describe("Whether the concept was in the course document or teacher-created"),
});

const transcriptSegmentSchema = z.object({
  timestamp: z.string().describe("ISO 8601 timestamp of the segment"),
  text: z.string().describe("The transcribed text (French)"),
  confidence: z.number().min(0).max(1).optional().describe("Transcription confidence score, if available"),
});

export const propose_question = defineTool({
  name: "propose_question",
  description:
    "Propose a French multiple-choice comprehension question (1 correct answer + 3 misconception-mapped distractors) built from a lesson transcript. Writes the proposal to shared state for the teacher to review — never sends anything to students.",
  parameters: z.object({
    questionText: z.string().min(1).describe("The question text, in French"),
    options: z
      .array(questionOptionSchema)
      .length(4)
      .describe("Exactly 4 options: 1 correct + 3 distractors, each distractor mapping to a distinct misconception ID"),
    conceptReference: conceptReferenceSchema,
    sourceTranscript: z
      .array(transcriptSegmentSchema)
      .describe("The transcript excerpt this question was built from"),
    exampleOrigin: z
      .enum(["transcript", "synthesized"])
      .describe("Whether the example was taken verbatim from the transcript or synthesized from the summary"),
  }),
  execute: async ({ questionText, options, conceptReference, sourceTranscript, exampleOrigin }) => {
    validateProposedQuestion(options as QuestionOption[]);

    questionBuilderState.proposedQuestion = {
      questionText,
      options: options as QuestionOption[],
      conceptReference,
      sourceTranscript,
      generatedAt: new Date().toISOString(),
      exampleOrigin,
      regenerationCount: questionBuilderState.regenerationCount,
      status: "proposed",
    };

    return questionBuilderState.proposedQuestion;
  },
});

export const reject_question = defineTool({
  name: "reject_question",
  description:
    "Record that the teacher rejected the current proposed question, optionally with a reason. Increments the regeneration count so a new proposal can be built.",
  parameters: z.object({
    rejectionReason: z.string().optional().describe("Optional feedback from the teacher on why it was rejected"),
  }),
  execute: async ({ rejectionReason }) => {
    if (!questionBuilderState.proposedQuestion) {
      return { ok: false, error: "There is no proposed question to reject" };
    }

    const nextRegenerationCount = questionBuilderState.regenerationCount + 1;

    if (nextRegenerationCount > MAX_REGENERATIONS) {
      questionBuilderState.proposedQuestion = {
        ...questionBuilderState.proposedQuestion,
        status: "expired",
        rejectionReason,
      };
      return {
        ok: true,
        status: "expired" as const,
        canRegenerate: false,
        message: "Maximum regenerations (2) reached after 3 total proposals. Skip this concept's question.",
      };
    }

    questionBuilderState.regenerationCount = nextRegenerationCount;
    questionBuilderState.proposedQuestion = {
      ...questionBuilderState.proposedQuestion,
      status: "rejected",
      rejectionReason,
    };

    return {
      ok: true,
      status: "rejected" as const,
      canRegenerate: true,
      regenerationCount: nextRegenerationCount,
    };
  },
});

export const get_current_question = defineTool({
  name: "get_current_question",
  description: "Read the current proposed question and its status, without modifying anything.",
  parameters: z.object({}),
  execute: async () => {
    return {
      proposedQuestion: questionBuilderState.proposedQuestion,
      regenerationCount: questionBuilderState.regenerationCount,
    };
  },
});
