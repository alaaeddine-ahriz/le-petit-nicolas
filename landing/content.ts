// All page copy, in both languages. Keep the two objects shaped identically.
export type Lang = "fr" | "en"

const fr = {
  brand: "Le Petit Nicolas",
  hero: {
    title: { before: "Le suivi du cours s'écrit ", highlight: "tout seul", after: "." },
    lead:
      "Après chaque cours en ligne, Le Petit Nicolas envoie aux élèves un quiz sur ce qui a vraiment été enseigné, et rend au professeur non pas une note, mais ce que la classe a mal compris.",
    cta: "Voir la démo",
    tag: "Le professeur ne tape qu'un mot : « ok ».",
    bubble: "Coucou ! Je m'occupe du quiz, toi tu fais cours.",
  },
  value: {
    title: "Ce que le professeur y gagne",
    items: [
      ["Un quiz qui vient du cours", "Écrit à partir de ce qui a été dit en classe, pas d'un manuel. Prêt quelques minutes après la fin."],
      ["Un diagnostic, pas une note", "Chaque mauvaise réponse nomme une erreur précise. Le professeur sait quoi refaire au prochain cours."],
      ["Zéro charge en plus", "Rien à installer pour les élèves, rien à saisir pour le professeur. Un « ok », et le reste suit."],
    ],
    reportTitle: "Le rapport, tel qu'il arrive sur Telegram",
    report: "18/28 corrects. Erreur dominante : ils additionnent les dénominateurs. Suggestion : refaire 1/2 + 1/3 au tableau.",
  },
  how: {
    title: "Comment on y arrive",
    steps: [
      "Fathom rejoint la visio (Zoom, Meet, Teams) et transcrit le cours.",
      "Un agent écrit cinq questions à partir du transcript et du programme.",
      "Le professeur répond « ok » : le bot Telegram poste les sondages à la classe.",
      "Les réponses sont analysées. Le professeur reçoit le rapport, chaque élève un message pour revoir ses erreurs.",
    ],
    trickTitle: "Le truc",
    trick: "Chaque distracteur est écrit pour attraper une erreur précise. Compter qui a choisi quoi, c'est déjà le diagnostic.",
    poll: {
      question: "Question 3 · Calcule : 1/4 + 2/3",
      notes: ["additionne les dénominateurs", "oublie de transformer les numérateurs", "juste", "multiplie au lieu d'additionner"],
      meta: "28 votes · sondage non anonyme",
    },
  },
  demo: { title: "La démo", placeholder: "La vidéo arrive après la démo." },
  footer: {
    team: "Construit en une journée à Paris par une équipe de quatre, pour les collèges qui n'ont pas d'assistant pédagogique.",
    stack: "Fathom · Inngest · Mastra · Claude · Telegram · CopilotKit · Supabase · Vercel",
    code: "Code source",
  },
}

const en: typeof fr = {
  brand: "Le Petit Nicolas",
  hero: {
    title: { before: "The lesson's follow‑up writes ", highlight: "itself", after: "." },
    lead:
      "After every online class, Le Petit Nicolas sends students a quiz about what was actually taught, and gives the teacher not a score, but what the class misunderstood.",
    cta: "Watch the demo",
    tag: "The teacher types one word: “ok”.",
    bubble: "Hi! I'll handle the quiz, you teach.",
  },
  value: {
    title: "What the teacher gets",
    items: [
      ["A quiz that comes from the lesson", "Written from what was said in class, not from a textbook. Ready minutes after the class ends."],
      ["A diagnosis, not a score", "Every wrong answer names a specific mistake. The teacher knows what to redo next lesson."],
      ["Zero extra work", "Nothing to install for students, nothing to type for the teacher. One “ok”, and the rest follows."],
    ],
    reportTitle: "The report, as it lands on Telegram",
    report: "18/28 correct. Main error: they add the denominators. Suggestion: redo 1/2 + 1/3 on the board.",
  },
  how: {
    title: "How we get there",
    steps: [
      "Fathom joins the video call (Zoom, Meet, Teams) and transcribes the lesson.",
      "An agent writes five questions from the transcript and the syllabus.",
      "The teacher replies “ok”: the Telegram bot posts the polls to the class.",
      "Answers are analysed. The teacher gets the report, each student a message to review their mistakes.",
    ],
    trickTitle: "The trick",
    trick: "Each wrong option is written to catch one specific mistake. Counting who picked what is already the diagnosis.",
    poll: {
      question: "Question 3 · Compute: 1/4 + 2/3",
      notes: ["adds the denominators", "forgets to convert the numerators", "correct", "multiplies instead of adding"],
      meta: "28 votes · non-anonymous poll",
    },
  },
  demo: { title: "The demo", placeholder: "The video comes after the demo." },
  footer: {
    team: "Built in one day in Paris by a team of four, for the schools that have no teaching assistant.",
    stack: "Fathom · Inngest · Mastra · Claude · Telegram · CopilotKit · Supabase · Vercel",
    code: "Source code",
  },
}

export const content: Record<Lang, typeof fr> = { fr, en }
