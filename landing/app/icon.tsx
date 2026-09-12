import { ImageResponse } from "next/og"
import { headCrop, INK, mascotDataUri } from "@/lib/og"

export const size = { width: 64, height: 64 }
export const contentType = "image/png"

export default async function Icon() {
  const src = await mascotDataUri()
  const crop = headCrop(size.width)
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", borderRadius: "50%", background: "#fff", border: `3px solid ${INK}`, overflow: "hidden", position: "relative" }}>
        <img src={src} alt="" style={{ position: "absolute", ...crop }} />
      </div>
    ),
    size,
  )
}
