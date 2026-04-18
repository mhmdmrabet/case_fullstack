import { useEffect, useRef } from "react"

import { MessageItem } from "@/components/chat/MessageItem"
import { ScrollArea } from "@/components/ui/scroll-area"
import type { AssistantMessage } from "@/state/chat-reducer"

type Props = {
  messages: AssistantMessage[]
}

export function MessageList({ messages }: Props) {
  const anchorRef = useRef<HTMLDivElement>(null)

  // Naive autoscroll: jump to bottom on every new part.
  // Step 12 upgrades this to an intent-aware version (IntersectionObserver).
  useEffect(() => {
    anchorRef.current?.scrollIntoView({ behavior: "smooth", block: "end" })
  }, [messages])

  if (messages.length === 0) {
    return <EmptyState />
  }

  return (
    <ScrollArea className="flex-1">
      <div
        className="mx-auto max-w-3xl space-y-8 px-4 py-6"
        role="log"
        aria-live="polite"
        aria-atomic="false"
      >
        {messages.map((m) => (
          <MessageItem key={m.id} message={m} />
        ))}
        <div ref={anchorRef} />
      </div>
    </ScrollArea>
  )
}

function EmptyState() {
  return (
    <div className="flex flex-1 items-center justify-center">
      <div className="text-center">
        <h2 className="text-2xl font-semibold tracking-tight">
          Que veux-tu analyser ?
        </h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Pose une question en français sur tes datasets CSV.
        </p>
      </div>
    </div>
  )
}
