// The social preview (1200×630, the size every network scales from): the hero title in the page's
// own fonts, the brand, and the mascot waving. One per language, built by the two opengraph-image routes.
import { ImageResponse } from "next/og"
import { content, type Lang } from "@/content"
import { font, headCrop, INK, mascotDataUri } from "@/lib/og"

export const OG_SIZE = { width: 1200, height: 630 }

export async function openGraphImage(lang: Lang) {
  const [mascot, dmSans, caveat] = await Promise.all([mascotDataUri(), font("DMSans-SemiBold.woff"), font("Caveat-Bold.woff")])
  const { hero, brand } = content[lang]
  const face = headCrop(56)
  // Satori has only the two fonts above; the non-breaking hyphen of the English title isn't in DM Sans.
  const words = hero.title.before.trim().replace(/‑/g, "-").split(" ")

  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", background: "#fff", color: INK, fontFamily: "DM Sans", padding: "64px 72px", position: "relative" }}>
        <div style={{ display: "flex", flexDirection: "column", justifyContent: "space-between", width: 680 }}>
          <div style={{ display: "flex", flexDirection: "column" }}>
            <div style={{ fontSize: 26, color: "#787774", marginBottom: 28 }}>{hero.eyebrow}</div>
            <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", fontSize: 76, lineHeight: 1.08, letterSpacing: -1.5 }}>
              {words.map((word, i) => <span key={i} style={{ marginRight: 20 }}>{word}</span>)}
              <span style={{ fontFamily: "Caveat", fontSize: 88, background: "#e9e9e7", borderRadius: 12, padding: "0 16px" }}>{hero.title.highlight}</span>
              <span>{hero.title.after}</span>
            </div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 16, fontSize: 30 }}>
            <div style={{ width: 56, height: 56, borderRadius: "50%", border: `3px solid ${INK}`, background: "#fff", overflow: "hidden", position: "relative", display: "flex" }}>
              <img src={mascot} alt="" style={{ position: "absolute", ...face }} />
            </div>
            <span>{brand}</span>
          </div>
        </div>
        <img src={mascot} alt="" style={{ position: "absolute", right: 24, bottom: -70, width: 620, height: 620 }} />
      </div>
    ),
    {
      ...OG_SIZE,
      fonts: [
        { name: "DM Sans", data: dmSans, weight: 600, style: "normal" },
        { name: "Caveat", data: caveat, weight: 700, style: "normal" },
      ],
    },
  )
}
