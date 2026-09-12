"use client"

import { useEffect, useState } from "react"
import { useInView } from "react-intersection-observer"
import { Mascot } from "@/components/Mascot"
import { Phone } from "@/components/Phone"
import { content, type Lang, type Scene } from "@/content"

const GITHUB = "https://github.com/alaaeddine-ahriz/le-petit-nicolas"

// One step of the story. Reports itself as active when it crosses the middle of the viewport.
function SceneBlock({ scene, index, onActive }: { scene: Scene; index: number; onActive: (i: number) => void }) {
  const { ref, inView } = useInView({ rootMargin: "-40% 0px -40% 0px" })
  useEffect(() => { if (inView) onActive(index) }, [inView, index, onActive])
  return (
    <div className="scene" ref={ref}>
      <span className="scene-n">{index + 1}</span>
      <h2>{scene.title}</h2>
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
            <p className="hand-red">{t.hero.tag}</p>
          </div>
          <div className="mascot-stage">
            <div className="bubble">{t.hero.bubble}</div>
            <Mascot />
          </div>
        </section>

        <section className="wrap story">
          <div className="scenes">
            {t.scenes.map((s, i) => <SceneBlock scene={s} index={i} onActive={setActive} key={i} />)}
          </div>
          <div className="sticky">
            <Phone chat={t.scenes[active].chat} sceneKey={active} />
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
