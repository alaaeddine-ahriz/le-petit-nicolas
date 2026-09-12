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
      <span className="scene-n">{index + 1}</span>
      <h3>{scene.title}</h3>
      <p>{scene.text}</p>
      <Phone chat={scene.chat} sceneKey={index} className="phone-inline" />
    </div>
  )
}

export function Landing({ lang }: { lang: Lang }) {
  const t = content[lang]
  const { active, bind } = useActiveScene(t.scenes.length)

  // Older links used ?lang=en on the home page; send them to the English page.
  useEffect(() => {
    if (lang === "fr" && new URLSearchParams(window.location.search).get("lang") === "en") window.location.replace(HOME.en)
  }, [lang])

  return (
    <>
      <header className="nav-bar">
        <div className="wrap nav">
          <a className="brand" href="#top">
            <span className="face-wrap"><Avatar size={36} /></span>
            {t.brand}
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
          <div>
            <span className="eyebrow rise" style={{ animationDelay: "0ms" }}>{t.hero.eyebrow}</span>
            <h1 className="rise" style={{ animationDelay: "80ms" }}>
              {t.hero.title.before}
              <mark className="hand">{t.hero.title.highlight}</mark>
              {t.hero.title.after}
            </h1>
            <p className="lead rise" style={{ animationDelay: "160ms" }}>{t.hero.lead}</p>
            <div className="cta rise" style={{ animationDelay: "240ms" }}>
              <a className="btn primary" href="#story">{t.hero.cta}</a>
              <a className="link" href={GITHUB}>{t.hero.secondary}<span className="arrow" aria-hidden="true">→</span></a>
            </div>
            <ul className="trust rise" style={{ animationDelay: "320ms" }}>
              {t.hero.trust.map((s) => <li key={s}>{s}</li>)}
            </ul>
          </div>
          <div className="mascot-stage rise" style={{ animationDelay: "200ms" }}>
            <div className="bubble hand pop">{t.hero.bubble}</div>
            <Avatar size={340} className="mascot" />
          </div>
        </section>

        {/* 2. The problem */}
        <section className="wrap narrow">
          <Reveal>
            <h2>{t.problem.title}</h2>
            <p>{t.problem.text}</p>
          </Reveal>
        </section>

        {/* 3. How it works: the phone follows the scroll */}
        <section className="band" id="story">
          <div className="wrap">
            <Reveal>
              <h2>{t.story.title}</h2>
              <p className="mute">{t.story.text}</p>
            </Reveal>
            <div className="story">
              <div className="scenes">
                {t.scenes.map((s, i) => <SceneBlock scene={s} index={i} active={i === active} sceneRef={bind(i)} key={i} />)}
              </div>
              <div className="sticky">
                <Phone chat={t.scenes[active].chat} sceneKey={active} />
              </div>
            </div>
          </div>
        </section>

        {/* 4. The differentiator */}
        <section className="wrap trick">
          <Reveal>
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
          <Reveal><h2>{t.benefits.title}</h2></Reveal>
          <div className="grid">
            {t.benefits.items.map(([title, text], i) => (
              <Reveal key={title} className={i === 1 ? "delay" : i === 2 ? "delay-2" : ""}>
                <article className="card">
                  <h3>{title}</h3>
                  <p>{text}</p>
                </article>
              </Reveal>
            ))}
          </div>
        </section>

        {/* 6. Trust */}
        <section className="band">
          <div className="wrap">
            <Reveal><h2>{t.rules.title}</h2></Reveal>
            <div className="rules">
              {t.rules.items.map(([title, text], i) => (
                <Reveal key={title} className={i % 2 ? "delay" : ""}>
                  <div className="rule">
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
        <section className="wrap narrow">
          <Reveal>
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
