import { defineTool } from "@copilotkit/runtime/v2";
import { z } from "zod";
import { getStudentLastAnswer } from "@data/repository";

/**
 * Lets the student helper answer "pourquoi j'ai faux ?".
 *
 * `list_lessons` / `get_lesson_transcript` only reach what was *taught*; this
 * reaches what the student personally *answered* — which quiz, which option,
 * and the misconception that option was designed to encode. Without it the
 * agent has no way to know which question a student means and can only say it
 * lacks context.
 *
 * Takes telegramUserId explicitly because agent tools, unlike channel tools,
 * never see who is speaking. updates-listener.ts passes it in when routing a
 * student's message.
 */
export const explain_my_answer = defineTool({
  name: "explain_my_answer",
  description:
    "Look up the quiz question this student most recently answered: what they chose, whether it was right, the specific misconception a wrong choice encodes, the correct answer, and what the teacher said about the concept. Call this whenever the student asks why they got something wrong, asks about 'la question' or 'le quiz', or wants their mistake explained.",
  parameters: z.object({
    telegramUserId: z
      .number()
      .describe(
        "The student's Telegram user id. It is stated at the start of the conversation — use that value, never guess one.",
      ),
  }),
  execute: async ({ telegramUserId }) => {
    const answer = await getStudentLastAnswer(telegramUserId);
    if (!answer) {
      return {
        found: false,
        note: "No recorded answer for this student. Say so honestly instead of guessing what they got wrong.",
      };
    }

    return {
      found: true,
      ...answer,
      howToUse:
        "Reply in French, to the student, warmly and without judgement. Start from what they chose and why that reasoning is tempting, then correct it using the teacher's own words in transcriptExcerpt and the same example. Two or three sentences. Don't just restate the right answer.",
    };
  },
});
