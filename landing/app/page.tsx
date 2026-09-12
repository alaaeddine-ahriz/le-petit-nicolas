"use client"

import { useEffect, useState } from "react"
import { useInView } from "react-intersection-observer"
import { Avatar } from "@/components/Avatar"
import { Phone } from "@/components/Phone"
import { content, type Lang, type Scene } from "@/content"

// Fill in before the demo. Empty values hide the matching element.
const DEMO_VIDEO = ""
const CONTACT = ""   // e.g. "mailto:team@example.com"
const GITHUB = "https://github.com/alaaeddine-ahriz/le-petit-nicolas"

// One step of the story. Reports itself as active when it crosses the middle of the viewport.
function SceneBlock({ scene, index, onActive }: { scene: Scene; index: number; onActive: (i: number) => void }) {
  const { ref, inView } = useInView({ rootMargin: "-40% 0px -40% 0px" })
  useEffect(() => { if (inView) onActive(index) }, [inView, index, onActive])
  return (
    <div className="scene" ref={ref}>
      <div className="scene-head">
        <span className="scene-n">{index + 1}</span>
        <Avatar mood={scene.mood} size={56} className="sticker" />
      </div>
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
      <header className="wrap nav">
        <a className="brand" href="#top">
          <Avatar size={40} />
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
          <a className="btn small" href="#demo">{t.nav.demo}</a>
        </div>
      </header>

      <main id="top">
        {/* 1. Hero: who it's for, what it does, one action, proof it's safe */}
        <section className="wrap hero">
          <div>
            <span className="eyebrow">{t.hero.eyebrow}</span>
            <h1>
              {t.hero.title.before}
              <span className="wavy">{t.hero.title.highlight}</span>
              {t.hero.title.after}
            </h1>
            <p className="lead">{t.hero.lead}</p>
            <div className="cta">
              <a className="btn primary" href="#demo">{t.hero.cta}</a>
              <a className="link" href="#story">{t.hero.secondary}</a>
            </div>
            <ul className="trust">
              {t.hero.trust.map((s) => <li key={s}>{s}</li>)}
            </ul>
          </div>
          <div className="mascot-stage">
            <div className="bubble">{t.hero.bubble}</div>
            <Avatar mood="hello" size={300} className="mascot" />
          </div>
        </section>

        {/* 2. The problem */}
        <section className="wrap problem">
          <div>
            <h2>{t.problem.title}</h2>
            <p>{t.problem.text}</p>
          </div>
          <div className="aside">
            <Avatar mood="think" size={120} className="sticker" />
            <div className="bubble small-bubble">{t.problem.bubble}</div>
          </div>
        </section>

        {/* 3. How it works: the phone follows the scroll */}
        <section className="wrap" id="story">
          <h2>{t.story.title}</h2>
          <p className="mute">{t.story.text}</p>
          <div className="story">
            <div className="scenes">
              {t.scenes.map((s, i) => <SceneBlock scene={s} index={i} onActive={setActive} key={i} />)}
            </div>
            <div className="sticky">
              <Phone chat={t.scenes[active].chat} sceneKey={active} />
            </div>
          </div>
        </section>

        {/* 4. The differentiator */}
        <section className="wrap trick">
          <div>
            <h2>{t.trick.title}</h2>
            <p>{t.trick.text}</p>
          </div>
          <div className="fiche">
            <div className="fiche-q">{t.trick.question}</div>
            <table>
              <tbody>
                {t.trick.rows.map(([opt, note]) => (
                  <tr key={opt} className={note === t.trick.rows[3][1] ? "ok" : ""}>
                    <td>{opt}</td>
                    <td className="annot">{note === t.trick.rows[3][1] ? "✓ " : "← "}{note}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* 5. Benefits + numbers */}
        <section className="wrap">
          <h2>{t.benefits.title}</h2>
          <div className="grid">
            {t.benefits.items.map(([title, text]) => (
              <article className="fiche" key={title}>
                <h3>{title}</h3>
                <p>{text}</p>
              </article>
            ))}
          </div>
          <div className="numbers">
            {t.numbers.map(([n, label]) => (
              <div className="postit" key={label}>
                <b>{n}</b>
                <span>{label}</span>
              </div>
            ))}
          </div>
        </section>

        {/* 6. Trust */}
        <section className="wrap">
          <h2>{t.rules.title}</h2>
          <div className="rules">
            {t.rules.items.map(([title, text]) => (
              <div className="rule" key={title}>
                <strong>{title}</strong>
                <span className="mute">{text}</span>
              </div>
            ))}
          </div>
        </section>

        {/* 7. FAQ: objections */}
        <section className="wrap faq">
          <h2>{t.faq.title}</h2>
          {t.faq.items.map(([q, a]) => (
            <details key={q}>
              <summary>{q}</summary>
              <p>{a}</p>
            </details>
          ))}
        </section>

        {/* 8. Demo */}
        <section className="wrap" id="demo">
          <h2>{t.demo.title}</h2>
          <p className="mute">{t.demo.text}</p>
          <div className="video">
            {DEMO_VIDEO ? (
              <iframe src={DEMO_VIDEO} title={t.demo.title} allow="autoplay; fullscreen" allowFullScreen />
            ) : (
              <div>
                <Avatar mood="cheer" size={140} />
                <div className="hand placeholder">{t.demo.placeholder}</div>
              </div>
            )}
          </div>
          <p style={{ marginTop: 16 }}><a className="link" href={GITHUB}>{t.demo.code} →</a></p>
        </section>

        {/* 9. Final call to action */}
        <section className="wrap final">
          <Avatar mood="wink" size={140} className="sticker" />
          <div>
            <h2>{t.final.title}</h2>
            <p>{t.final.text}</p>
            <div className="cta">
              {CONTACT && <a className="btn primary" href={CONTACT}>{t.final.cta}</a>}
              <a className="btn" href="#demo">{t.hero.cta}</a>
            </div>
          </div>
        </section>
      </main>

      <footer className="wrap">
        <p>{t.footer.team}</p>
        <p className="mute small">
          {t.footer.stack} · <a href={GITHUB}>{t.footer.code}</a>
          <br />
          {t.footer.avatar}
        </p>
      </footer>
    </>
  )
}
