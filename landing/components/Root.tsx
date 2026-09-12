// The <html> shell shared by the French and English root layouts.
import type { ReactNode } from "react"
import "devices.css/dist/devices.css"
import "@/app/globals.css"
import { body, hand } from "@/app/fonts"
import type { Lang } from "@/content"

export function Root({ lang, children }: { lang: Lang; children: ReactNode }) {
  return (
    <html lang={lang} className={`${body.variable} ${hand.variable}`}>
      <body>
        {/* sections fade in as they scroll into view; without scripts they must simply be visible */}
        <noscript><style>{`.reveal{opacity:1;transform:none}`}</style></noscript>
        {children}
      </body>
    </html>
  )
}
