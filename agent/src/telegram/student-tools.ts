import { defineChannelTool } from "@copilotkit/channels";
import { z } from "zod";
import { getStudentLastAnswer } from "@data/repository";

/**
 * A channel tool, not an agent tool, because only channel tools get `ctx.actor`
 * — the Telegram account of whoever is talking. Without it the bot has no way
 * to know which student is asking, which quiz they answered, or what they
 * picked, so "pourquoi j'ai faux ?" can only be answered with "I don't have the
 * context".
 */
export const explainMyAnswer = defineChannelTool({
  name: "explain_my_answer",
  description:
    "Look up the quiz question this student most recently answered, what they chose, whether it was right, the specific misconception their wrong choice encodes, the correct answer, and what the teacher actually said about the concept. Call this whenever a student asks why their answer was wrong, asks for an explanation, or refers to 'the quiz' / 'the question' — it is the only way to know which question they mean.",
  parameters: z.object({}),
  handler: async (_args, ctx) => {
    const telegramUserId = Number(ctx.actor.id);
    if (!Number.isFinite(telegramUserId)) {
      return "Could not identify this Telegram account.";
    }

    const answer = await getStudentLastAnswer(telegramUserId);
    if (!answer) {
      return "This Telegram account is not a registered student, or has not answered any quiz yet. Say so plainly rather than guessing what they got wrong.";
    }

    return {
      ...answer,
      howToUse:
        "Explain in French, addressed to the student, warmly and without judgement. Start from what they chose and why that reasoning is tempting, then correct it using the teacher's own words in transcriptExcerpt and the same example where possible. Two or three sentences. Do not just state the right answer.",
    };
  },
});
