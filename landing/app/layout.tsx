import type { Metadata } from "next"
import type { ReactNode } from "react"
import { DM_Sans } from "next/font/google"
import "devices.css/dist/devices.css"
import "./globals.css"

const font = DM_Sans({ subsets: ["latin"], weight: ["400", "500", "600"], variable: "--font-body" })

export const metadata: Metadata = {
  title: "Le Petit Nicolas — Le suivi du cours s'écrit tout seul",
  description:
    "Un assistant pédagogique qui assiste au cours en ligne, écrit le quiz, l'envoie aux élèves sur Telegram et dit au professeur ce qui a été mal compris.",
}

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="fr" className={font.variable}>
      <body>{children}</body>
    </html>
  )
}
