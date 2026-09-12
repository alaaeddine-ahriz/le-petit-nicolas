// 404 for both languages: the two root layouts live in route groups, so the not-found page carries its own shell.
import type { Metadata } from "next"
import { Root } from "@/components/Root"

export const metadata: Metadata = { title: "Page introuvable — Le Petit Nicolas" }
export { viewport } from "@/lib/meta"

export default function GlobalNotFound() {
  return (
    <Root lang="fr">
      <main className="wrap narrow" style={{ paddingTop: 96, paddingBottom: 96 }}>
        <span className="eyebrow">404</span>
        <h1>Cette page n'existe pas.</h1>
        <p className="lead">
          <a className="link" href="/">Retour à l'accueil</a>
          <span className="mute"> · </span>
          <a className="link" href="/en" hrefLang="en" lang="en">Back to the English page</a>
        </p>
      </main>
    </Root>
  )
}
