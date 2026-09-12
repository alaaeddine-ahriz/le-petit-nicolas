import type { Metadata, Viewport } from "next"
import { content, type Lang } from "@/content"

export const HOME: Record<Lang, string> = { fr: "/", en: "/en" }

// Absolute URLs for the social preview image. Set NEXT_PUBLIC_SITE_URL on the host; Vercel is detected.
const site = process.env.NEXT_PUBLIC_SITE_URL
  ?? (process.env.VERCEL_PROJECT_PRODUCTION_URL ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}` : "http://localhost:3001")

export function siteMetadata(lang: Lang): Metadata {
  const { title, description } = content[lang].meta
  return {
    metadataBase: new URL(site),
    title,
    description,
    alternates: { canonical: HOME[lang], languages: { fr: HOME.fr, en: HOME.en, "x-default": HOME.fr } },
    openGraph: { type: "website", siteName: "Le Petit Nicolas", locale: lang === "fr" ? "fr_FR" : "en_GB", url: HOME[lang], title, description },
    twitter: { card: "summary_large_image", title, description },
  }
}

export const viewport: Viewport = { themeColor: "#ffffff", colorScheme: "light" }
