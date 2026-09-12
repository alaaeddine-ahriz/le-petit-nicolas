# Le Petit Nicolas

**Hackathon :** AI Thinkerers, Paris
**Objectif :** une edtech low-tech, multi-canal (mail, Telegram, Slack, potentiellement SMS) qui soutient les enseignants en classe.

---

## Title
**Le Petit Nicolas — the teaching assistant every classroom deserves**

## One-liner
An AI teaching assistant that captures the lesson (via a Google Meet the teacher already runs) and, within minutes of class ending, checks whether the class understood and tells the teacher exactly what to re-explain next time.

---

## Written description (full submission)

### The problem
No secondary school in France, Morocco or most of the world has teaching assistants. One teacher faces thirty students, six times a day. Three consequences, all well known to anyone who has taught:

- **The teacher is flying blind.** "C'est clair ?" is answered by silence, and the gap only surfaces on the test two weeks later.
- **The students who are lost say nothing.** Raising your hand in front of thirty peers is a social cost most won't pay — and the ones who won't pay it are disproportionately the ones already behind.
- **Everything that would fix this costs time the teacher doesn't have.** Writing checks, correcting them, tracking who struggles with what. So it doesn't happen, and families who can afford private tutoring buy the difference.

Existing tools miss the moment. Lecture-capture products transcribe and stop. General assistants know nothing about *this* class, *this* teacher, *this* lesson. Nothing acts inside the fifty minutes where it would matter.

### What we built
Le Petit Nicolas is an agent with two surfaces and one brain.

The teacher runs the class over a Google Meet they already use. Fathom joins as a notetaker and produces the transcript; once the call ends, the agent pulls it and builds a model of the lesson — which concepts were taught, in what order, with which examples — grounded in the teacher's own course document.

For each concept, the agent **proposes** a comprehension check. The teacher approves with one tap. A multiple-choice question, built from what the teacher **actually said about that concept**, goes out individually to each student in their own private Telegram chat with the bot — within minutes of the lesson ending, not two weeks later on a test. Every distractor is engineered to encode a specific, plausible student error, and each option is tagged with the misconception it represents so answers can be diagnosed, not just scored.

Sixty seconds later the teacher gets back a hint, not a score:

> *18/28 corrects. Erreur dominante : ils additionnent les dénominateurs. Suggestion : refaire 1/2 + 1/3 au tableau.*

Because the wrong answers map to named misconceptions, the agent can say *what* the class misunderstood, not just *how many* got it wrong. The teacher re-explains, in the room, while it still matters.

At the end of the lesson: notes and a quiz to the class, and a per-student record in a memory that builds itself. The teacher's whole vocabulary is four commands. They never enter data.

### The design principle
**The teacher is the conductor; the agent is the instrument.**

The agent proposes and never acts alone. It never messages students without approval. Each student answers privately, one-on-one with the agent — no class group, no peer pressure, no visible ranking. Only the teacher's voice is captured; audio is deleted after transcription; no student audio, no cameras. Reports go to the teacher, never to administration, and the agent never scores the teacher.

This isn't a convention we hope holds. Every class-facing action is gated by Auth0 asynchronous authorization, so "the agent cannot act without the teacher" is enforced at the identity layer.

### Why this isn't just a transcription tool
Lecture-capture tools stop at the transcript and a summary. The product here is what happens *after* that transcript exists: distractors engineered to encode specific student errors, a diagnosis of the class's dominant misconception (not just a score), and delivery on the channel every student already has open — their own phone, one-on-one, no app to install. Take away that layer and this is a generic meeting-notes tool; the value is entirely in what the agent does with the transcript in the minutes after class.

### How it's built
- **Telegram (grammY)** — the student layer. Each student has a private 1:1 chat with the bot (onboarded once via `/start`); quizzes are sent individually and answers are aggregated server-side. Zero install.
- **CopilotKit** — the teacher console. Live lesson state streamed into the UI, human-in-the-loop approval, the hint rendered as actionable generative UI, and natural-language chat with class memory after the lesson.
- **Auth0** — identity and the approval gate. Universal Login over student data; async authorization (CIBA) on every action that reaches the class.
- **Exa** — grounding in the world: a sourced *« Saviez-vous que… »* tied to the current concept, and a remediation resource matched to the misconception actually detected.
- **Claude** — lesson state, concept detection, question generation, misconception analysis, notes and quizzes.
- **Fathom (via MCP)** — lesson capture. The teacher runs the class over a Google Meet (or similar); Fathom joins as a notetaker and produces the transcript. The agent pulls it through a Fathom MCP server once the call ends.

The core is channel-agnostic. Telegram is one implementation of a `Channel` interface; WhatsApp and SMS are adapters, which matters for the classrooms this is ultimately for.

### Where it goes
Built and demoed in French for a French collège. Designed to run on the phone every teacher in Casablanca, Dakar or Abidjan already owns — where the tutoring gap is widest and the assistant shortage is absolute. Next: WhatsApp and SMS channels, Arabic and Darija, homework correction, curriculum coverage tracking.

**Every class gets a teaching assistant, for the price of a phone on the desk.**

---

## Social post

> We built **Le Petit Nicolas**: an AI teaching assistant that sits in the classroom and in the class group chat.
>
> It listens to the lesson, and when the teacher taps once, it asks the class a question built from what was *just said*. Sixty seconds later the teacher knows exactly what to re-explain — not a score, the actual misconception.
>
> The teacher never types anything. The agent never acts alone.
>
> Telegram for students · CopilotKit console for the teacher · Auth0 gating every class-facing action · Exa for sourced enrichment · Claude for the brain.
>
> Every class gets a TA, for the price of a phone on the desk.
>
> [tags]

---

## Notes for the video voiceover
Open on the problem, not the tech: *"Thirty students. One teacher. Nobody raises their hand."*
Close on the line: *"Every class gets a teaching assistant, for the price of a phone on the desk."*

---

## Équipe & répartition des tâches
Un dossier par composant, un owner par dossier (voir [README.md](README.md)) :

| Dossier  | Quoi                                                      | Qui |
|----------|-----------------------------------------------------------|-----|
| `agent/` | Runtime agent + tools + chat UI (Next.js autonome)         | Ahriz / Juan |
| `app/`   | Console web enseignant                                     | Ahriz |
| `brain/` | Fonctions Claude : checks, analyse des réponses, quiz, notes | Juan |
| `io/`    | Channel Telegram, ingestion du transcript                  | Amira |
| `data/`  | Schéma Supabase, repositories, Auth0                       | Ayman |

## Notes de contexte
- Le texte anglais ci-dessus est le fichier de soumission fourni par un membre de l'équipe (déjà rédigé) — **corrigé** pour refléter le modèle 1:1 (voir ci-dessous), le texte original parlait d'un groupe classe.
- Stack : CopilotKit (runtime + channel Telegram via `@copilotkit/channels-telegram`), Supabase, Auth0 (CIBA / async authorization), Exa, Claude, Fathom (transcript post-call).
- Canaux visés à terme : Telegram, mail, Slack, SMS (via une interface `Channel` agnostique du canal).
- État : `agent/` tourne (CopilotKit + Exa + channel Telegram, Supabase câblé), `data/` a son schéma appliqué en base. `app/`, `brain/` et `io/` sont encore des dossiers vides.

### Décision archi : chat privé 1:1, pas de groupe classe
Les élèves parlent à l'agent **individuellement** en chat privé Telegram — il n'y a **pas** de groupe classe. Conséquences :
- **Onboarding requis** : chaque élève doit envoyer `/start` au bot une fois pour que Telegram fournisse son `chat_id` privé (le bot ne peut pas initier une conversation avec un utilisateur qui ne lui a jamais écrit).
- **Table Supabase `students`** : doit stocker `telegram_user_id` / `chat_id` par élève, lié à son identité (nom, classe).
- **Pas de poll Telegram natif de groupe** : l'agent envoie le QCM individuellement à chaque élève et **agrège les réponses lui-même côté serveur** (au lieu de laisser Telegram agréger un poll de groupe).
- **`TELEGRAM_CLASS_GROUP_CHAT_ID` dans `.env` est probablement obsolète** — à remplacer par la logique d'envoi individuel une fois le schéma `students` prêt.

### Décision archi : capture via Fathom (post-call), pas de Deepgram
Le prof lance le cours sur Google Meet (ou équivalent) ; Fathom rejoint comme notetaker. Le bot/agent se connecte au **Fathom MCP** pour récupérer le transcript. **Confirmé : le transcript n'est disponible qu'une fois le call terminé** (pas de streaming live) — Deepgram est abandonné.

Conséquences :
- **Le pitch "before the bell rings" / temps réel devient "quelques minutes après le cours".** Le texte de la description a été ajusté en ce sens (one-liner, "What we built", "Why this isn't just a transcription tool").
- **Plus de détection de concept en direct** : toute la segmentation en concepts se fait sur le transcript complet, après coup. Les quiz sont donc générés/proposés au prof en batch (un par concept détecté) juste après le cours, plutôt qu'un par un pendant la leçon.
- **`FATHOM_API_KEY` remplace `DEEPGRAM_API_KEY`** dans `.env`.
- **À vérifier avec Juan** : quel MCP Fathom précisément (plusieurs implémentations communautaires existent, ex. `Dot-Fun/fathom-mcp`), et s'il expose un **webhook** "transcript ready" pour déclencher le traitement automatiquement plutôt que de poller.
- ⚠️ **Reste en tension non résolue** : la conclusion de la description ("every class gets a teaching assistant, for the price of a phone on the desk", + le paragraphe Casablanca/Dakar/Abidjan) suppose un simple téléphone. Avec Google Meet, il faut un ordinateur + connexion correcte côté prof — à retravailler ou assumer explicitement dans la version finale du pitch.

### Décision archi : accès Supabase côté serveur uniquement
RLS est activé sur les 12 tables **sans aucune policy**. Donc la publishable key ne peut ni lire (retourne vide, sans erreur) ni écrire (`42501`) — seule la `SUPABASE_SERVICE_ROLE_KEY` passe, côté serveur.

C'est un choix assumé : rien dans l'archi n'a besoin d'accès DB depuis le navigateur (ingestion Fathom, génération de quiz, bot Telegram et runtime CopilotKit sont tous côté serveur), donc on a la sécurité gratuitement plutôt que de câbler les JWT Auth0 dans des policies RLS pendant un hackathon. Seule contrainte : pas de Supabase Realtime depuis le front — les mises à jour live de l'UI prof passent par le stream CopilotKit.

Ne pas "corriger" ça en désactivant RLS : la publishable key est embarquée dans le bundle JS, donc table ouverte = dossier de n'importe quel élève lisible par n'importe qui. Détails dans [data/SCHEMA.md](data/SCHEMA.md).

## TODO / à décider
- [ ] Comment lier le `/start` Telegram d'un prof à son compte `teachers` existant (créé via Auth0) — à trancher avec `io/`.
- [ ] Quel MCP Fathom exactement, et s'il expose un webhook "transcript ready".
- [ ] Retravailler la conclusion du pitch (tension "téléphone sur le bureau" vs Google Meet, voir ci-dessus).
- [ ] Préparer les slides / la vidéo de démo.

## Schéma Supabase
Voir [data/SCHEMA.md](data/SCHEMA.md) et [data/migrations/0001_init.sql](data/migrations/0001_init.sql) — schéma **appliqué en base** (12 tables : raw layer + `student_concept_profile` distillé, qui implémente la "mémoire par élève"). Domaine possédé par `data/` (Supabase + Auth0) selon la convention du repo — voir [README.md](README.md).
