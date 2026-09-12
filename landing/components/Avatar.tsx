// The mascot: DiceBear "Notionists" style by Zoish (CC0), black line art in the Notion spirit.
// One character, several poses, generated once into public/avatar/<pose>.svg by scripts/avatar.sh.
export type Pose = "face" | "hello" | "phone" | "point" | "ok" | "cheer" | "think"

export function Avatar({ pose = "face", size = 40, className }: { pose?: Pose; size?: number; className?: string }) {
  return <img src={`/avatar/${pose}.svg`} width={size} height={size} alt="" className={className} draggable={false} />
}
