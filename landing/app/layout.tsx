import type { Metadata } from "next"
import type { ReactNode } from "react"
import { Caveat, Nunito } from "next/font/google"
import "./globals.css"

const hand = Caveat({ subsets: ["latin"], weight: ["600", "700"], variable: "--font-hand" })
const body = Nunito({ subsets: ["latin"], weight: ["400", "600", "800"], variable: "--font-body" })

export const metadata: Metadata = {
  title: "Le Petit Nicolas — Le suivi du cours s'écrit tout seul",
  description:
    "Un assistant pédagogique qui assiste au cours en ligne, écrit le quiz, l'envoie aux élèves sur Telegram et dit au professeur ce qui a été mal compris.",
}

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="fr" className={`${hand.variable} ${body.variable}`}>
      <body>{children}</body>
    </html>
  )
}
