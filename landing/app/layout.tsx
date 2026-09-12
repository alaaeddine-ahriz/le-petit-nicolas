import type { Metadata } from "next"
import type { ReactNode } from "react"
import { Inter } from "next/font/google"
import "devices.css/dist/devices.css"
import "./globals.css"

const inter = Inter({ subsets: ["latin"], weight: ["400", "500", "600", "800"], variable: "--font-body" })

export const metadata: Metadata = {
  title: "Le Petit Nicolas — Le suivi du cours s'écrit tout seul",
  description:
    "Un assistant pédagogique qui assiste au cours en ligne, écrit le quiz, l'envoie aux élèves sur Telegram et dit au professeur ce qui a été mal compris.",
}

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="fr" className={inter.variable}>
      <body>{children}</body>
    </html>
  )
}
