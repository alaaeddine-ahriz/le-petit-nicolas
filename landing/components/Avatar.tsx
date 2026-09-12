// The mascot: DiceBear "Adventurer" style by Lisa Wischofsky (CC BY 4.0), generated once and stored in
// public/avatar/<mood>.svg. Regenerate with the URL in scripts/avatar.sh if you want another look.
export type Mood = "hello" | "talk" | "think" | "cheer" | "wink"

export function Avatar({ mood = "hello", size = 40, className }: { mood?: Mood; size?: number; className?: string }) {
  return <img src={`/avatar/${mood}.svg`} width={size} height={size} alt="" className={className} draggable={false} />
}
