"use client"

import { useEffect, useRef, useState, type ReactNode } from "react"
import { useInView } from "react-intersection-observer"
import { Avatar } from "@/components/Avatar"
import { Phone } from "@/components/Phone"
import { content, type Lang, type Scene } from "@/content"
import { HOME } from "@/lib/meta"

// Fill in before the demo. An empty CONTACT hides the "write to us" button.
const CONTACT = ""   // e.g. "mailto:team@example.com"
const GITHUB = "https://github.com/alaaeddine-ahriz/le-petit-nicolas"

// Fades and lifts its children in the first time they scroll into view.
function Reveal({ children, className }: { children: ReactNode; className?: string }) {
  const { ref, inView } = useInView({ threshold: 0.15, triggerOnce: true })
  return <div ref={ref} className={["reveal", inView ? "in" : "", className].filter(Boolean).join(" ")}>{children}</div>
}

// The current scene is the last one whose top edge has passed the middle of the viewport.
// Measured geometry rather than intersection events, so two scenes straddling the middle
// can't fight over the phone, and a jump (anchor, reload) lands on the right conversation.
function useActiveScene(count: number) {
  const els = useRef<(HTMLElement | null)[]>([])
  const [active, setActive] = useState(0)

  useEffect(() => {
    const measure = () => {
      const middle = window.innerHeight / 2
      let current = 0
      els.current.forEach((el, i) => { if (el && el.getBoundingClientRect().top <= middle) current = i })
      setActive(current)
    }
    measure()
    window.addEventListener("scroll", measure, { passive: true })
    window.addEventListener("resize", measure)
    return () => {
      window.removeEventListener("scroll", measure)
      window.removeEventListener("resize", measure)
    }
  }, [count])

  const bind = (i: number) => (el: HTMLElement | null) => { els.current[i] = el }
  return { active, bind }
}

function SceneBlock({ scene, index, active, sceneRef }: { scene: Scene; index: number; active: boolean; sceneRef: (el: HTMLElement | null) => void }) {
  return (
    <div className={active ? "scene active" : "scene"} ref={sceneRef}>
      <div className="scene-topline">
        <span className="scene-n">{String(index + 1).padStart(2, "0")}</span>
        <span className="scene-line" aria-hidden="true" />
      </div>
      <h3>{scene.title}</h3>
      <p>{scene.text}</p>
      <Phone chat={scene.chat} sceneKey={index} className="phone-inline" />
    </div>
  )
}

export function Landing({ lang }: { lang: Lang }) {
  const t = content[lang]
  const { active, bind } = useActiveScene(t.scenes.length)
  const [progress, setProgress] = useState(0)

  const problemStats = lang === "fr"
    ? [["30", "élèves"], ["1", "cours"], ["0", "assistant"]]
    : [["30", "students"], ["1", "lesson"], ["0", "assistants"]]

  useEffect(() => {
    const updateProgress = () => {
      const scrollable = document.documentElement.scrollHeight - window.innerHeight
      setProgress(scrollable > 0 ? Math.min(100, (window.scrollY / scrollable) * 100) : 0)
    }
    updateProgress()
    window.addEventListener("scroll", updateProgress, { passive: true })
    window.addEventListener("resize", updateProgress)
    return () => {
      window.removeEventListener("scroll", updateProgress)
      window.removeEventListener("resize", updateProgress)
    }
  }, [])

  // Older links used ?lang=en on the home page; send them to the English page.
  useEffect(() => {
    if (lang === "fr" && new URLSearchParams(window.location.search).get("lang") === "en") window.location.replace(HOME.en)
  }, [lang])

  return (
    <>
      <div className="page-progress" style={{ width: `${progress}%` }} aria-hidden="true" />
      <header className="nav-bar">
        <div className="wrap nav">
          <a className="brand" href="#top">
            <span className="face-wrap"><Avatar size={36} /></span>
            <span>{t.brand}</span>
          </a>
          <div className="nav-right">
            <nav className="lang" aria-label={t.nav.lang}>
              {(["fr", "en"] as Lang[]).map((l) => (
                <a key={l} href={HOME[l]} hrefLang={l} lang={l} aria-current={lang === l ? "page" : undefined}>
                  {l.toUpperCase()}
                </a>
              ))}
            </nav>
            <a className="btn primary small" href="#story">{t.hero.cta}</a>
          </div>
        </div>
      </header>

      <main id="top">
        {/* 1. Hero: staggered entrance on load */}
        <section className="wrap hero">
          <div className="hero-copy">
            <div className="eyebrow-row rise" style={{ animationDelay: "0ms" }}>
              <span className="eyebrow">{t.hero.eyebrow}</span>
              <span className="eyebrow-signal"><i /> {lang === "fr" ? "en ligne" : "online"}</span>
            </div>
            <h1 className="rise" style={{ animationDelay: "80ms" }}>
              {t.hero.title.before}
              <mark className="hand">{t.hero.title.highlight}</mark>
              {t.hero.title.after}
            </h1>
            <p className="lead rise" style={{ animationDelay: "160ms" }}>{t.hero.lead}</p>
            <div className="cta rise" style={{ animationDelay: "240ms" }}>
              <a className="btn primary" href="#story">{t.hero.cta}<span className="btn-arrow" aria-hidden="true">↗</span></a>
              <a className="link" href={GITHUB}>{t.hero.secondary}<span className="arrow" aria-hidden="true">→</span></a>
            </div>
            <ul className="trust rise" style={{ animationDelay: "320ms" }}>
              {t.hero.trust.map((s) => <li key={s}>{s}</li>)}
            </ul>
            <div className="hero-note rise" style={{ animationDelay: "400ms" }}>
              <span className="note-star" aria-hidden="true">✦</span>
              {lang === "fr" ? "Pensé pour ce qui se passe après le cours." : "Made for what happens after class."}
            </div>
          </div>
          <div className="mascot-stage rise" style={{ animationDelay: "200ms" }}>
            <span className="stage-orbit orbit-one" aria-hidden="true" />
            <span className="stage-orbit orbit-two" aria-hidden="true" />
            <div className="stage-topline">
              <span className="live-pill"><i /> {lang === "fr" ? "ASSISTANT ACTIF" : "ASSISTANT ACTIVE"}</span>
              <span className="stage-id">LP–01</span>
            </div>
            <div className="bubble hand pop">{t.hero.bubble}</div>
            <Avatar size={340} className="mascot" />
            <div className="floating-note note-left">
              <strong>5</strong>
              <span>{lang === "fr" ? "questions prêtes" : "questions ready"}</span>
            </div>
            <div className="floating-note note-right">
              <span className="mini-check">✓</span>
              <span>{lang === "fr" ? "le prof valide" : "teacher approved"}</span>
            </div>
            <div className="mascot-caption">
              <span>{lang === "fr" ? "Il écoute. Tu enseignes." : "It listens. You teach."}</span>
              <span className="caption-dot" aria-hidden="true" />
            </div>
          </div>
        </section>

        {/* 2. The problem */}
        <section className="wrap narrow problem-section">
          <Reveal>
            <span className="section-kicker">01 <span /> {lang === "fr" ? "Le point de départ" : "The starting point"}</span>
            <div className="problem-layout">
              <div>
                <h2>{t.problem.title}</h2>
                <p>{t.problem.text}</p>
              </div>
              <div className="problem-stats" aria-label={lang === "fr" ? "Le problème en chiffres" : "The problem in numbers"}>
                {problemStats.map(([value, label]) => <div className="problem-stat" key={label}><strong>{value}</strong><span>{label}</span></div>)}
              </div>
            </div>
          </Reveal>
        </section>

        {/* 3. How it works: the phone follows the scroll */}
        <section className="band" id="story">
          <div className="wrap">
            <Reveal>
              <span className="section-kicker">02 <span /> {lang === "fr" ? "Le geste simple" : "The simple gesture"}</span>
              <h2>{t.story.title}</h2>
              <p className="mute">{t.story.text}</p>
            </Reveal>
            <div className="story">
              <div className="scenes">
                {t.scenes.map((s, i) => <SceneBlock scene={s} index={i} active={i === active} sceneRef={bind(i)} key={i} />)}
              </div>
              <div className="sticky">
                <div className="phone-pod">
                  <Phone chat={t.scenes[active].chat} sceneKey={active} />
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* 4. The differentiator */}
        <section className="wrap trick">
          <Reveal>
            <span className="section-kicker">03 <span /> {lang === "fr" ? "Le détail qui compte" : "The detail that matters"}</span>
            <h2>{t.trick.title}</h2>
            <p>{t.trick.text}</p>
          </Reveal>
          <Reveal className="delay">
            <div className="card">
              <div className="card-q">{t.trick.question}</div>
              <table>
                <tbody>
                  {t.trick.rows.map(([opt, note], i) => {
                    const ok = i === t.trick.rows.length - 1
                    return (
                      <tr key={opt} className={ok ? "ok" : ""}>
                        <td>{opt}</td>
                        <td className="annot hand"><span aria-hidden="true">{ok ? "✓ " : "← "}</span>{note}</td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </Reveal>
        </section>

        {/* 5. Benefits */}
        <section className="wrap">
          <Reveal>
            <span className="section-kicker">04 <span /> {lang === "fr" ? "Le résultat" : "The result"}</span>
            <h2>{t.benefits.title}</h2>
          </Reveal>
          <div className="grid">
            {t.benefits.items.map(([title, text], i) => (
              <Reveal key={title} className={i === 1 ? "delay" : i === 2 ? "delay-2" : ""}>
                <article className="card benefit-card">
                  <span className="card-index">0{i + 1}</span>
                  <h3>{title}</h3>
                  <p>{text}</p>
                  <span className="card-tail" aria-hidden="true">↗</span>
                </article>
              </Reveal>
            ))}
          </div>
        </section>

        {/* 6. Trust */}
        <section className="band">
          <div className="wrap">
            <Reveal>
              <span className="section-kicker">05 <span /> {lang === "fr" ? "La confiance" : "The trust layer"}</span>
              <h2>{t.rules.title}</h2>
            </Reveal>
            <div className="rules">
              {t.rules.items.map(([title, text], i) => (
                <Reveal key={title} className={i % 2 ? "delay" : ""}>
                  <div className="rule">
                    <span className="rule-number">0{i + 1}</span>
                    <strong>{title}</strong>
                    <span className="mute">{text}</span>
                  </div>
                </Reveal>
              ))}
            </div>
          </div>
        </section>

        {/* 7. FAQ */}
        <section className="wrap faq">
          <Reveal>
            <span className="section-kicker">06 <span /> {lang === "fr" ? "Pas de question bête" : "No silly questions"}</span>
            <h2>{t.faq.title}</h2>
            {t.faq.items.map(([q, a]) => (
              <details key={q}>
                <summary>{q}</summary>
                <p>{a}</p>
              </details>
            ))}
          </Reveal>
        </section>

        {/* 8. Final call to action */}
        <section className="wrap narrow final-section">
          <Reveal>
            <span className="section-kicker">07 <span /> {lang === "fr" ? "À vous de jouer" : "Your move"}</span>
            <h2>{t.final.title}</h2>
            <p>{t.final.text}</p>
            <div className="cta">
              {CONTACT && <a className="btn primary" href={CONTACT}>{t.final.cta}</a>}
              <a className="btn" href={GITHUB}>{t.hero.secondary}</a>
            </div>
          </Reveal>
        </section>
      </main>

      <footer>
        <div className="wrap">
          <p>{t.footer.team}</p>
          <p className="mute small">
            <a href={GITHUB}>{t.footer.code}</a> · {t.footer.avatar}
          </p>
        </div>
      </footer>
    </>
  )
}
