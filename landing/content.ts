// All page copy, in both languages. Keep the two objects shaped identically.
export type Lang = "fr" | "en"

export type Poll = { question: string; options: [string, number][]; correct: number }
export type Message = { from: "bot" | "me"; text?: string; poll?: Poll; time: string }
export type Chat = { kind: "dm" | "group"; name: string; sub: string; messages: Message[] }
export type Scene = { title: string; text: string; chat: Chat }

const BOT = "Le Petit Nicolas"

const fr = {
  brand: BOT,
  nav: { demo: "Voir la démo" },
  hero: {
    eyebrow: "Pour les profs de collège qui font cours en ligne",
    title: { before: "Le suivi du cours s'écrit ", highlight: "tout seul", after: "." },
    lead:
      "Après chaque cours en ligne, Le Petit Nicolas envoie aux élèves un quiz sur ce qui a vraiment été enseigné, et rend au professeur non pas une note, mais ce que la classe a mal compris.",
    cta: "Voir la démo",
    secondary: "Comment ça marche ↓",
    trust: ["Rien à installer pour les élèves", "Le prof garde la main", "L'audio n'est jamais conservé"],
    bubble: "Coucou ! Je m'occupe du quiz, toi tu fais cours.",
  },
  problem: {
    title: "Un prof, trente élèves, zéro assistant.",
    text: "Après le cours, vérifier qui a compris prend un temps que le professeur n'a pas. Alors ça ne se fait pas. Les élèves perdus ne lèvent pas la main, et les familles qui le peuvent achètent la différence en cours particuliers.",
  },
  story: {
    title: "Comment ça marche",
    text: "Quatre temps, tous après le cours. Le professeur intervient une fois.",
  },
  scenes: [
    {
      title: "Le cours se termine.",
      text: "Le cours est transcrit. Le professeur reçoit le quiz.",
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
  trick: {
    title: "Les mauvaises réponses sont le diagnostic.",
    text: "Chaque distracteur est écrit pour attraper une erreur précise. Compter qui a choisi quoi, c'est déjà savoir quoi refaire au prochain cours.",
    question: "1/4 + 2/3 = ?",
    rows: [
      ["3/7", "additionne les dénominateurs"],
      ["3/12", "oublie de transformer les numérateurs"],
      ["2/12", "multiplie au lieu d'additionner"],
      ["11/12", "juste"],
    ],
  },
  benefits: {
    title: "Ce que ça change",
    items: [
      ["Pour le professeur", "Un rapport en trois lignes, pas un tableur. Il sait quoi refaire jeudi."],
      ["Pour les élèves", "Un quiz sur leur téléphone, puis un tuteur qui reprend leurs erreurs. Rien à installer."],
      ["Pour la classe", "Une mémoire qui se construit seule : qui maîtrise quoi, cours après cours."],
    ],
  },
  rules: {
    title: "Construit pour la classe, pas pour l'administration.",
    items: [
      ["Le professeur dirige.", "L'agent propose, le professeur approuve. Rien n'arrive aux élèves sans son « ok »."],
      ["Seul le cours est enregistré.", "La visio est transcrite ; on garde le texte, pas l'audio. Pas de caméra, pas de voix d'élève."],
      ["Le rapport va au professeur.", "Jamais à l'administration. Jamais une note sur le professeur."],
      ["Les élèves n'installent rien.", "Telegram, qu'ils ont déjà. Des sondages dans le groupe, un message privé pour le tutorat."],
    ],
  },
  faq: {
    title: "Questions fréquentes",
    items: [
      ["Et si le cours est en présentiel ?", "Aujourd'hui, Le Petit Nicolas rejoint les cours en visio (Zoom, Meet, Teams). La version « téléphone posé sur le bureau » est la prochaine étape."],
      ["Que devient l'enregistrement ?", "La visio est transcrite, on garde le texte du cours, jamais l'audio. Aucune voix d'élève, aucune caméra."],
      ["Quelles matières, quels niveaux ?", "Le quiz est écrit à partir du transcript et du programme, donc toutes les matières. Testé au collège, sur les fractions en 4ème."],
      ["Et si le quiz est mauvais ?", "Le professeur le voit avant les élèves. Un « ok » l'envoie, un « non » l'enterre, et il peut le modifier dans la console."],
      ["Combien ça coûte ?", "Rien pour l'instant : c'est un prototype de hackathon. On cherche des professeurs pour l'essayer avec leur classe."],
    ],
  },
  demo: { title: "La démo", text: "Un cours de fractions sur Google Meet, deux téléphones d'élèves, un professeur qui répond « ok ».", placeholder: "La vidéo arrive après la démo.", code: "Voir le code" },
  final: {
    title: "Un professeur, une classe, un cours. On essaie ?",
    text: "Écrivez-nous, on branche Le Petit Nicolas sur votre prochain cours en ligne.",
    cta: "Écrire à l'équipe",
  },
  footer: {
    team: "Construit en une journée à Paris par une équipe de quatre, pour les collèges qui n'ont pas d'assistant pédagogique.",
    code: "Code source",
    avatar: "Illustrations : Notionists de Zoish (CC0), via DiceBear.",
  },
}

const en: typeof fr = {
  brand: BOT,
  nav: { demo: "Watch the demo" },
  hero: {
    eyebrow: "For secondary-school teachers who teach online",
    title: { before: "The lesson's follow‑up writes ", highlight: "itself", after: "." },
    lead:
      "After every online class, Le Petit Nicolas sends students a quiz about what was actually taught, and gives the teacher not a score, but what the class misunderstood.",
    cta: "Watch the demo",
    secondary: "How it works ↓",
    trust: ["Nothing to install for students", "The teacher stays in charge", "Audio is never kept"],
    bubble: "Hi! I'll handle the quiz, you teach.",
  },
  problem: {
    title: "One teacher, thirty students, zero assistants.",
    text: "After class, checking who understood takes time the teacher doesn't have. So it doesn't happen. Lost students don't raise their hand, and families who can afford it buy the difference in private tutoring.",
  },
  story: {
    title: "How it works",
    text: "Four steps, all after class. The teacher steps in once.",
  },
  scenes: [
    {
      title: "The class ends.",
      text: "The lesson is transcribed. The teacher receives the quiz.",
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
  trick: {
    title: "Wrong answers are the diagnosis.",
    text: "Each wrong option is written to catch one specific mistake. Counting who picked what already tells the teacher what to redo next lesson.",
    question: "1/4 + 2/3 = ?",
    rows: [
      ["3/7", "adds the denominators"],
      ["3/12", "forgets to convert the numerators"],
      ["2/12", "multiplies instead of adding"],
      ["11/12", "correct"],
    ],
  },
  benefits: {
    title: "What changes",
    items: [
      ["For the teacher", "A three-line report, not a spreadsheet. They know what to redo on Thursday."],
      ["For students", "A quiz on their phone, then a tutor who goes over their mistakes. Nothing to install."],
      ["For the class", "A memory that builds itself: who masters what, lesson after lesson."],
    ],
  },
  rules: {
    title: "Built for the classroom, not for the administration.",
    items: [
      ["The teacher leads.", "The agent proposes, the teacher approves. Nothing reaches students without their “ok”."],
      ["Only the lesson is recorded.", "The call is transcribed; we keep the text, not the audio. No camera, no student voices."],
      ["The report goes to the teacher.", "Never to the administration. Never a score on the teacher."],
      ["Students install nothing.", "Telegram, which they already have. Polls in the group, a private message for tutoring."],
    ],
  },
  faq: {
    title: "Frequently asked questions",
    items: [
      ["What about in-person classes?", "Today Le Petit Nicolas joins online classes (Zoom, Meet, Teams). The “phone on the desk” version is the next step."],
      ["What happens to the recording?", "The call is transcribed; we keep the lesson's text, never the audio. No student voices, no camera."],
      ["Which subjects and levels?", "The quiz is written from the transcript and the syllabus, so any subject. Tested in middle school, on fractions."],
      ["What if the quiz is bad?", "The teacher sees it before the students do. An “ok” sends it, a “no” buries it, and it can be edited in the console."],
      ["How much does it cost?", "Nothing for now: it's a hackathon prototype. We're looking for teachers to try it with their class."],
    ],
  },
  demo: { title: "The demo", text: "A fractions lesson on Google Meet, two student phones, a teacher replying “ok”.", placeholder: "The video comes after the demo.", code: "See the code" },
  final: {
    title: "One teacher, one class, one lesson. Shall we try?",
    text: "Write to us and we'll plug Le Petit Nicolas into your next online class.",
    cta: "Write to the team",
  },
  footer: {
    team: "Built in one day in Paris by a team of four, for the schools that have no teaching assistant.",
    code: "Source code",
    avatar: "Illustrations: Notionists by Zoish (CC0), via DiceBear.",
  },
}

export const content: Record<Lang, typeof fr> = { fr, en }
