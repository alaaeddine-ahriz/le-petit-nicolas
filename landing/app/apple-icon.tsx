import { ImageResponse } from "next/og"
import { headCrop, mascotDataUri } from "@/lib/og"

export const size = { width: 180, height: 180 }
export const contentType = "image/png"

// iOS rounds the corners itself, so this is a plain white square with the face.
export default async function AppleIcon() {
  const src = await mascotDataUri()
  const crop = headCrop(size.width, 2)
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", background: "#fff", overflow: "hidden", position: "relative" }}>
        <img src={src} alt="" style={{ position: "absolute", ...crop }} />
      </div>
    ),
    size,
  )
}
