import { content } from "@/content"
import { OG_SIZE, openGraphImage } from "@/lib/og-image"

export const alt = content.en.meta.title
export const size = OG_SIZE
export const contentType = "image/png"

export default function Image() {
  return openGraphImage("en")
}
