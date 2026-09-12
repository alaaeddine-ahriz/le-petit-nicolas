import type { ReactNode } from "react"
import { Root } from "@/components/Root"
import { siteMetadata } from "@/lib/meta"

export const metadata = siteMetadata("fr")
export { viewport } from "@/lib/meta"

export default function Layout({ children }: { children: ReactNode }) {
  return <Root lang="fr">{children}</Root>
}
