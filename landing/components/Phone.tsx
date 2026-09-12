// A phone showing one Telegram conversation. Frame from devices.css (MIT); the chat inside is ours.
import type { CSSProperties } from "react"
import { Avatar } from "@/components/Avatar"
import type { Chat, Poll } from "@/content"

function PollCard({ poll }: { poll: Poll }) {
  const total = poll.options.reduce((n, [, c]) => n + c, 0)
  return (
    <div className="tg-poll">
      <div className="tg-poll-q">{poll.question}</div>
      <div className="tg-poll-meta">Quiz · {total} votes</div>
      {poll.options.map(([label, count], i) => {
        const pct = total ? Math.round((count / total) * 100) : 0
        const ok = i === poll.correct
        return (
          <div className={ok ? "tg-opt ok" : "tg-opt"} key={label}>
            <span className="tg-pct">{pct}%</span>
            <div className="tg-opt-body">
              <div className="tg-opt-label">{label}{ok ? " ✓" : ""}</div>
              <div className="tg-bar"><i style={{ width: `${Math.max(pct, 2)}%` }} /></div>
            </div>
          </div>
        )
      })}
    </div>
  )
}

export function Phone({ chat, sceneKey, className }: { chat: Chat; sceneKey: number; className?: string }) {
  return (
    <div className={["phone", className].filter(Boolean).join(" ")} aria-hidden="true">
      <div className="device device-iphone-14-pro">
        <div className="device-frame">
          <div className="device-screen">
            <div className="tg">
              <div className="tg-top">
                <span className="tg-back">‹</span>
                {chat.kind === "dm" ? (
                  <span className="tg-avatar"><Avatar size={40} /></span>
                ) : (
                  <span className="tg-avatar tg-avatar-group">4B</span>
                )}
                <span className="tg-title">
                  <b>{chat.name}</b>
                  <small>{chat.sub}</small>
                </span>
              </div>
              {/* keyed on the scene so the messages replay their entrance when the conversation changes */}
              <div className="tg-body" key={sceneKey}>
                {chat.messages.map((m, i) => (
                  <div className={m.from === "me" ? "tg-m out" : "tg-m in"} key={i} style={{ "--i": i } as CSSProperties}>
                    {chat.kind === "group" && m.from === "bot" && <div className="tg-sender">Le Petit Nicolas</div>}
                    {m.poll ? <PollCard poll={m.poll} /> : <span className="tg-text">{m.text}</span>}
                    <span className="tg-time">{m.time}{m.from === "me" ? " ✓✓" : ""}</span>
                  </div>
                ))}
              </div>
              <div className="tg-input"><span>Message</span><span className="tg-mic">🎤</span></div>
            </div>
          </div>
        </div>
        <div className="device-stripe" />
        <div className="device-header" />
        <div className="device-sensors" />
        <div className="device-btns" />
        <div className="device-power" />
      </div>
    </div>
  )
}
