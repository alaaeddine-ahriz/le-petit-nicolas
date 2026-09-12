"use client"

import { useEffect, useState, type ReactNode } from "react"
import { useInView } from "react-intersection-observer"
import { Avatar } from "@/components/Avatar"
import { Phone } from "@/components/Phone"
import { content, type Lang, type Scene } from "@/content"

// Fill in before the demo. Empty values hide the matching element.
const DEMO_VIDEO = ""
const CONTACT = ""   // e.g. "mailto:team@example.com"
const GITHUB = "https://github.com/alaaeddine-ahriz/le-petit-nicolas"

// Fades and lifts its children in the first time they scroll into view.
function Reveal({ children, className }: { children: ReactNode; className?: string }) {
  const { ref, inView } = useInView({ threshold: 0.15, triggerOnce: true })
  return <div ref={ref} className={["reveal", inView ? "in" : "", className].filter(Boolean).join(" ")}>{children}</div>
}

// One step of the story. Reports itself as active when it crosses the middle of the viewport.
function SceneBlock({ scene, index, active, onActive }: { scene: Scene; index: number; active: boolean; onActive: (i: number) => void }) {
  const { ref, inView } = useInView({ rootMargin: "-40% 0px -40% 0px" })
  useEffect(() => { if (inView) onActive(index) }, [inView, index, onActive])
  return (
    <div className={active ? "scene active" : "scene"} ref={ref}>
      <span className="scene-n">{index + 1}</span>
      <h3>{scene.title}</h3>
      <p>{scene.text}</p>
      <Phone chat={scene.chat} sceneKey={index} className="phone-inline" />
    </div>
  )
}

export default function Page() {
  const [lang, setLang] = useState<Lang>("fr")
  const [active, setActive] = useState(0)

  // ?lang=en wins, then the last choice on this device, else French.
  useEffect(() => {
    try {
      const fromUrl = new URLSearchParams(window.location.search).get("lang")
      const stored = window.localStorage.getItem("lang")
      setLang(fromUrl === "en" || fromUrl === "fr" ? fromUrl : stored === "en" ? "en" : "fr")
    } catch {}
  }, [])

  useEffect(() => {
    document.documentElement.lang = lang
    try { window.localStorage.setItem("lang", lang) } catch {}
  }, [lang])

  const t = content[lang]

  return (
    <>
      <header className="nav-bar">
        <div className="wrap nav">
          <a className="brand" href="#top">
            <span className="face-wrap"><Avatar size={36} /></span>
            {t.brand}
          </a>
          <div className="nav-right">
            <div className="lang" role="group" aria-label="Langue / Language">
              {(["fr", "en"] as Lang[]).map((l) => (
                <button key={l} type="button" aria-pressed={lang === l} onClick={() => setLang(l)}>
                  {l.toUpperCase()}
                </button>
              ))}
            </div>
            <a className="btn primary small" href="#demo">{t.nav.demo}</a>
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
              <a className="btn primary" href="#demo">{t.hero.cta}</a>
              <a className="link" href="#story">{t.hero.secondary}</a>
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
                {t.scenes.map((s, i) => <SceneBlock scene={s} index={i} active={i === active} onActive={setActive} key={i} />)}
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
                        <td className="annot hand">{ok ? "✓ " : "← "}{note}</td>
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

        {/* 8. Demo */}
        <section className="wrap" id="demo">
          <Reveal>
            <h2>{t.demo.title}</h2>
            <p className="mute">{t.demo.text}</p>
            <div className="video">
              {DEMO_VIDEO ? (
                <iframe src={DEMO_VIDEO} title={t.demo.title} allow="autoplay; fullscreen" allowFullScreen />
              ) : (
                <div className="placeholder hand">{t.demo.placeholder}</div>
              )}
            </div>
            <p style={{ marginTop: 16 }}><a className="link" href={GITHUB}>{t.demo.code} →</a></p>
          </Reveal>
        </section>

        {/* 9. Final call to action */}
        <section className="wrap narrow">
          <Reveal>
            <h2>{t.final.title}</h2>
            <p>{t.final.text}</p>
            <div className="cta">
              {CONTACT && <a className="btn primary" href={CONTACT}>{t.final.cta}</a>}
              <a className="btn" href="#demo">{t.hero.cta}</a>
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
