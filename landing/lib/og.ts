// Assets for the generated images (favicon, Apple touch icon, social preview): the mascot as a data URI
// and the two fonts as bytes. Satori (next/og) takes WOFF and TTF, not WOFF2.
import { readFile } from "node:fs/promises"
import { join } from "node:path"

export const INK = "#191919"

export async function mascotDataUri() {
  const svg = await readFile(join(process.cwd(), "public/avatar/nicolas.svg"))
  return `data:image/svg+xml;base64,${svg.toString("base64")}`
}

export const font = (file: string) => readFile(join(process.cwd(), "app/fonts", file))

// The mascot's head, cropped like .face-wrap does on the page: the image is enlarged 2.1× around a
// point 18% down from its top, so the face fills a square of the given size.
export function headCrop(size: number, scale = 2.1) {
  const img = size * scale
  return { width: img, height: img, left: (size - img) / 2, top: size * 0.18 - img * 0.18 }
}
