"use client"

import { useEffect, useState } from "react"
import { Mascot } from "@/components/Mascot"
import { content, type Lang } from "@/content"

// Fill in before the demo. An empty demoVideo shows the placeholder frame.
const DEMO_VIDEO = ""
const GITHUB = "https://github.com/alaaeddine-ahriz/le-petit-nicolas"

// Poll example: option label, vote count, index of the note in content.how.poll.notes
const POLL = [
  { label: "3/7", count: 10 },
  { label: "3/12", count: 0 },
  { label: "11/12", count: 18, ok: true },
  { label: "2/12", count: 0 },
]
const TOTAL = POLL.reduce((n, o) => n + o.count, 0)

export default function Page() {
  const [lang, setLang] = useState<Lang>("fr")

  // ?lang=en wins, then the last choice on this device, else French.
  useEffect(() => {
    try {
      const fromUrl = new URLSearchParams(window.location.search).get("lang")
      const stored = window.localStorage.getItem("lang")
      const initial = fromUrl === "en" || fromUrl === "fr" ? fromUrl : stored === "en" ? "en" : "fr"
      setLang(initial)
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
          <Mascot variant="head" title="" />
          {t.brand}
        </a>
        <div className="lang" role="group" aria-label="Langue / Language">
          {(["fr", "en"] as Lang[]).map((l) => (
            <button key={l} type="button" aria-pressed={lang === l} onClick={() => setLang(l)}>
              {l.toUpperCase()}
            </button>
          ))}
        </div>
      </header>

      <main id="top">
        <section className="wrap hero">
          <div>
            <h1>
              {t.hero.title.before}
              <span className="wavy">{t.hero.title.highlight}</span>
              {t.hero.title.after}
            </h1>
            <p className="lead">{t.hero.lead}</p>
            <p><a className="btn primary" href="#demo">{t.hero.cta}</a></p>
            <p className="hand-red">{t.hero.tag}</p>
          </div>
          <div className="mascot-stage">
            <div className="bubble">{t.hero.bubble}</div>
            <Mascot />
          </div>
        </section>

        <section className="wrap" aria-labelledby="value-title">
          <h2 id="value-title">{t.value.title}</h2>
          <div className="grid">
            {t.value.items.map(([title, text]) => (
              <article className="fiche" key={title}>
                <h3>{title}</h3>
                <p>{text}</p>
              </article>
            ))}
          </div>
          <h3 className="sub">{t.value.reportTitle}</h3>
          <div className="dm">
            <Mascot variant="head" title="" />
            <div className="msg">
              <div className="from">{t.brand}</div>
              {t.value.report}
            </div>
          </div>
        </section>

        <section className="wrap" aria-labelledby="how-title">
          <h2 id="how-title">{t.how.title}</h2>
          <div className="how">
            <ol className="steps">
              {t.how.steps.map((s) => <li key={s}>{s}</li>)}
            </ol>
            <div>
              <div className="poll" aria-label={t.how.trickTitle}>
                <div className="q">{t.how.poll.question}</div>
                {POLL.map((o, i) => {
                  const pct = Math.round((o.count / TOTAL) * 100)
                  const note = t.how.poll.notes[i]
                  return (
                    <div className={o.ok ? "opt ok" : "opt"} key={o.label}>
                      <span className="dot" aria-hidden="true" />
                      <div>
                        <div style={{ fontWeight: 800 }}>{o.label}</div>
                        <div className="bar" aria-hidden="true"><i style={{ width: `${pct}%` }} /></div>
                        <div className={o.ok ? "annot ok" : "annot"}>{o.ok ? "✓ " : "← "}{note}</div>
                      </div>
                      <span className="pct">{pct} %</span>
                    </div>
                  )
                })}
                <div className="mute small">{t.how.poll.meta}</div>
              </div>
              <p className="trick"><strong className="hand">{t.how.trickTitle}</strong> {t.how.trick}</p>
            </div>
          </div>
        </section>

        <section className="wrap" id="demo" aria-labelledby="demo-title">
          <h2 id="demo-title">{t.demo.title}</h2>
          <div className="video">
            {DEMO_VIDEO ? (
              <iframe src={DEMO_VIDEO} title={t.demo.title} allow="autoplay; fullscreen" allowFullScreen />
            ) : (
              <div>
                <Mascot title="" />
                <div className="hand placeholder">{t.demo.placeholder}</div>
              </div>
            )}
          </div>
        </section>
      </main>

      <footer className="wrap">
        <p>{t.footer.team}</p>
        <p className="mute small">
          {t.footer.stack} · <a href={GITHUB}>{t.footer.code}</a>
        </p>
      </footer>
    </>
  )
}
