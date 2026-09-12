// All page copy, in both languages. Keep the two objects shaped identically.
export type Lang = "fr" | "en"

export type Poll = { question: string; options: [string, number][]; correct: number }
export type Message = { from: "bot" | "me"; text?: string; poll?: Poll; time: string }
export type Chat = { kind: "dm" | "group"; name: string; sub: string; messages: Message[] }
export type Scene = { title: string; text: string; chat: Chat }

const BOT = "Le Petit Nicolas"

const fr = {
  brand: BOT,
  hero: {
    title: { before: "Le suivi du cours s'écrit ", highlight: "tout seul", after: "." },
    lead:
      "Après chaque cours en ligne, Le Petit Nicolas envoie aux élèves un quiz sur ce qui a vraiment été enseigné, et rend au professeur non pas une note, mais ce que la classe a mal compris.",
    tag: "Le professeur ne tape qu'un mot : « ok ».",
    bubble: "Coucou ! Je m'occupe du quiz, toi tu fais cours.",
  },
  scenes: [
    {
      title: "Le cours se termine.",
      text: "Fathom a transcrit. Le professeur reçoit le quiz.",
      chat: {
        kind: "dm", name: BOT, sub: "bot",
        messages: [
          { from: "bot", text: "Cours de 14h terminé. 5 questions prêtes sur l'addition de fractions.", time: "15:02" },
          { from: "bot", text: "Q3 · Calcule : 1/4 + 2/3\nA. 3/7   B. 3/12   C. 11/12   D. 2/12", time: "15:02" },
          { from: "bot", text: "Répondre « ok » pour envoyer à la 4ème B.", time: "15:02" },
          { from: "me", text: "ok", time: "15:04" },
        ],
      },
    },
    {
      title: "Les élèves répondent.",
      text: "Cinq sondages dans le groupe de la classe. Depuis leur téléphone.",
      chat: {
        kind: "group", name: "4ème B · Maths", sub: "29 membres",
        messages: [
          { from: "bot", text: "Quiz du cours d'aujourd'hui. 5 questions.", time: "15:05" },
          { from: "bot", poll: { question: "Q3 · Calcule : 1/4 + 2/3", options: [["3/7", 10], ["3/12", 0], ["11/12", 18], ["2/12", 0]], correct: 2 }, time: "15:05" },
        ],
      },
    },
    {
      title: "Le professeur reçoit le diagnostic.",
      text: "Pas une note : l'erreur dominante, et quoi refaire.",
      chat: {
        kind: "dm", name: BOT, sub: "bot",
        messages: [
          { from: "bot", text: "18/28 corrects. Erreur dominante : ils additionnent les dénominateurs. Suggestion : refaire 1/2 + 1/3 au tableau.", time: "16:10" },
          { from: "bot", text: "10 élèves ont choisi 3/7 : Yassine, Adam, Hugo… La carte de la classe est dans la console.", time: "16:10" },
          { from: "me", text: "merci", time: "16:12" },
        ],
      },
    },
    {
      title: "Chaque élève revoit ses erreurs.",
      text: "Un message à ceux qui se sont trompés. Le tuteur fait le reste.",
      chat: {
        kind: "dm", name: BOT, sub: "bot",
        messages: [
          { from: "bot", text: "Salut Yassine ! Tu veux qu'on revoie la question 3 ensemble ?", time: "16:15" },
          { from: "me", text: "ok", time: "16:20" },
          { from: "bot", text: "1/4, c'est moins qu'un demi. Si j'ajoute 2/3, je peux tomber sur 3/7 ?", time: "16:20" },
          { from: "me", text: "non… il faut le même dénominateur ?", time: "16:22" },
          { from: "bot", text: "Exactement. Lequel marche pour 4 et 3 ?", time: "16:22" },
        ],
      },
    },
  ] as Scene[],
  footer: {
    team: "Construit en une journée à Paris par une équipe de quatre, pour les collèges qui n'ont pas d'assistant pédagogique.",
    stack: "Fathom · Inngest · Mastra · Claude · Telegram · CopilotKit · Supabase · Vercel",
    code: "Code source",
  },
}

const en: typeof fr = {
  brand: BOT,
  hero: {
    title: { before: "The lesson's follow‑up writes ", highlight: "itself", after: "." },
    lead:
      "After every online class, Le Petit Nicolas sends students a quiz about what was actually taught, and gives the teacher not a score, but what the class misunderstood.",
    tag: "The teacher types one word: “ok”.",
    bubble: "Hi! I'll handle the quiz, you teach.",
  },
  scenes: [
    {
      title: "The class ends.",
      text: "Fathom has transcribed. The teacher receives the quiz.",
      chat: {
        kind: "dm", name: BOT, sub: "bot",
        messages: [
          { from: "bot", text: "2 pm class over. 5 questions ready on adding fractions.", time: "3:02 pm" },
          { from: "bot", text: "Q3 · Compute: 1/4 + 2/3\nA. 3/7   B. 3/12   C. 11/12   D. 2/12", time: "3:02 pm" },
          { from: "bot", text: "Reply “ok” to send it to 4ème B.", time: "3:02 pm" },
          { from: "me", text: "ok", time: "3:04 pm" },
        ],
      },
    },
    {
      title: "Students answer.",
      text: "Five polls in the class group. From their phones.",
      chat: {
        kind: "group", name: "4ème B · Maths", sub: "29 members",
        messages: [
          { from: "bot", text: "Today's quiz. 5 questions.", time: "3:05 pm" },
          { from: "bot", poll: { question: "Q3 · Compute: 1/4 + 2/3", options: [["3/7", 10], ["3/12", 0], ["11/12", 18], ["2/12", 0]], correct: 2 }, time: "3:05 pm" },
        ],
      },
    },
    {
      title: "The teacher gets the diagnosis.",
      text: "Not a score: the main error, and what to redo.",
      chat: {
        kind: "dm", name: BOT, sub: "bot",
        messages: [
          { from: "bot", text: "18/28 correct. Main error: they add the denominators. Suggestion: redo 1/2 + 1/3 on the board.", time: "4:10 pm" },
          { from: "bot", text: "10 students picked 3/7: Yassine, Adam, Hugo… The class map is in the console.", time: "4:10 pm" },
          { from: "me", text: "thanks", time: "4:12 pm" },
        ],
      },
    },
    {
      title: "Each student reviews their mistakes.",
      text: "A message to those who got it wrong. The tutor does the rest.",
      chat: {
        kind: "dm", name: BOT, sub: "bot",
        messages: [
          { from: "bot", text: "Hi Yassine! Want to go over question 3 together?", time: "4:15 pm" },
          { from: "me", text: "ok", time: "4:20 pm" },
          { from: "bot", text: "1/4 is less than a half. If I add 2/3, can I land on 3/7?", time: "4:20 pm" },
          { from: "me", text: "no… same denominator first?", time: "4:22 pm" },
          { from: "bot", text: "Exactly. Which one works for 4 and 3?", time: "4:22 pm" },
        ],
      },
    },
  ] as Scene[],
  footer: {
    team: "Built in one day in Paris by a team of four, for the schools that have no teaching assistant.",
    stack: "Fathom · Inngest · Mastra · Claude · Telegram · CopilotKit · Supabase · Vercel",
    code: "Source code",
  },
}

export const content: Record<Lang, typeof fr> = { fr, en }
