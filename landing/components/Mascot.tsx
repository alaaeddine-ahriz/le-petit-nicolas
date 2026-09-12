// Original mascot: a cartoon schoolboy (cowlick, striped sweater, short trousers, satchel) waving hello.
// Drawn from scratch as inline SVG so it scales, animates (see .wave in globals.css) and needs no asset.
type Props = { variant?: "full" | "head"; className?: string; title?: string }

export function Mascot({ variant = "full", className, title = "Le Petit Nicolas, la mascotte" }: Props) {
  const viewBox = variant === "head" ? "58 12 104 120" : "0 0 220 300"
  return (
    <svg viewBox={viewBox} className={["mascot", className].filter(Boolean).join(" ")} role="img" aria-label={title}>
      <title>{title}</title>
      {variant === "full" && (
        <>
          {/* ground shadow */}
          <ellipse cx="110" cy="288" rx="60" ry="7" fill="rgba(29,42,90,.12)" />

          {/* satchel, behind the body */}
          <path d="M150 150 C 152 132, 176 132, 180 150" fill="none" stroke="#1d2a5a" strokeWidth="3" />
          <rect x="140" y="150" width="50" height="42" rx="7" fill="#9a6440" stroke="#1d2a5a" strokeWidth="2.5" />
          <path d="M140 164 h50" stroke="#1d2a5a" strokeWidth="2.5" />
          <rect x="159" y="168" width="12" height="9" rx="2" fill="#f0c75e" stroke="#1d2a5a" strokeWidth="2" />

          {/* legs, socks, shoes */}
          <rect x="86" y="228" width="17" height="40" rx="7" fill="#f3cfae" stroke="#1d2a5a" strokeWidth="2.5" />
          <rect x="117" y="228" width="17" height="40" rx="7" fill="#f3cfae" stroke="#1d2a5a" strokeWidth="2.5" />
          <rect x="84" y="256" width="21" height="11" fill="#ffffff" stroke="#1d2a5a" strokeWidth="2" />
          <rect x="115" y="256" width="21" height="11" fill="#ffffff" stroke="#1d2a5a" strokeWidth="2" />
          <path d="M78 266 h30 a9 9 0 0 1 9 9 v5 h-48 v-5 a9 9 0 0 1 9 -9z" fill="#2b2b2b" stroke="#1d2a5a" strokeWidth="2.5" />
          <path d="M112 266 h30 a9 9 0 0 1 9 9 v5 h-48 v-5 a9 9 0 0 1 9 -9z" fill="#2b2b2b" stroke="#1d2a5a" strokeWidth="2.5" />

          {/* short trousers */}
          <path d="M76 192 h68 v36 a6 6 0 0 1 -6 6 h-22 v-18 h-12 v18 h-22 a6 6 0 0 1 -6 -6z" fill="#5b4632" stroke="#1d2a5a" strokeWidth="2.5" />

          {/* right arm holding the strap */}
          <path d="M150 152 q18 12 12 40" fill="none" stroke="#1d2a5a" strokeWidth="19" strokeLinecap="round" />
          <path d="M150 152 q18 12 12 40" fill="none" stroke="#2f55c4" strokeWidth="14" strokeLinecap="round" />
          <circle cx="162" cy="194" r="11" fill="#f3cfae" stroke="#1d2a5a" strokeWidth="2.5" />

          {/* sweater with stripes and collar */}
          <path d="M70 140 q40 -20 80 0 v56 h-80z" fill="#2f55c4" stroke="#1d2a5a" strokeWidth="2.5" />
          <path d="M72 158 h76 M72 172 h76 M72 186 h76" stroke="#ffffff" strokeWidth="5" strokeOpacity=".9" />
          <path d="M92 136 l18 18 l18 -18" fill="none" stroke="#ffffff" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" />

          {/* waving left arm */}
          <g className="wave">
            <path d="M70 150 q-26 -8 -32 -50" fill="none" stroke="#1d2a5a" strokeWidth="19" strokeLinecap="round" />
            <path d="M70 150 q-26 -8 -32 -50" fill="none" stroke="#2f55c4" strokeWidth="14" strokeLinecap="round" />
            <circle cx="38" cy="98" r="12" fill="#f3cfae" stroke="#1d2a5a" strokeWidth="2.5" />
          </g>

          {/* neck */}
          <rect x="101" y="118" width="18" height="18" fill="#f3cfae" stroke="#1d2a5a" strokeWidth="2.5" />
        </>
      )}

      {/* head */}
      <circle cx="66" cy="90" r="8" fill="#f3cfae" stroke="#1d2a5a" strokeWidth="2.5" />
      <circle cx="154" cy="90" r="8" fill="#f3cfae" stroke="#1d2a5a" strokeWidth="2.5" />
      <circle cx="110" cy="84" r="44" fill="#f6d7b8" stroke="#1d2a5a" strokeWidth="2.5" />
      <path d="M66 80 q8 -46 44 -46 q36 0 44 46 q-14 -16 -44 -14 q-30 -2 -44 14z" fill="#3b2a1a" stroke="#1d2a5a" strokeWidth="2.5" strokeLinejoin="round" />
      <path d="M112 38 q3 -18 16 -24 q-5 13 -1 24z" fill="#3b2a1a" stroke="#1d2a5a" strokeWidth="2.5" strokeLinejoin="round" />
      <path d="M88 76 q8 -6 16 0 M116 76 q8 -6 16 0" fill="none" stroke="#1d2a5a" strokeWidth="2.5" strokeLinecap="round" />
      <circle cx="96" cy="88" r="4.6" fill="#1d2a5a" />
      <circle cx="124" cy="88" r="4.6" fill="#1d2a5a" />
      <circle cx="97.6" cy="86.4" r="1.5" fill="#ffffff" />
      <circle cx="125.6" cy="86.4" r="1.5" fill="#ffffff" />
      <path d="M110 92 q-5 9 3 10" fill="none" stroke="#1d2a5a" strokeWidth="2.5" strokeLinecap="round" />
      <path d="M96 106 q14 13 28 0" fill="none" stroke="#1d2a5a" strokeWidth="2.5" strokeLinecap="round" />
      <circle cx="82" cy="102" r="5.5" fill="#f29c9c" opacity=".55" />
      <circle cx="138" cy="102" r="5.5" fill="#f29c9c" opacity=".55" />
      <g fill="#c98a5b">
        <circle cx="80" cy="96" r="1.2" /><circle cx="86" cy="94" r="1.2" /><circle cx="84" cy="99" r="1.2" />
        <circle cx="140" cy="96" r="1.2" /><circle cx="134" cy="94" r="1.2" /><circle cx="136" cy="99" r="1.2" />
      </g>
    </svg>
  )
}
