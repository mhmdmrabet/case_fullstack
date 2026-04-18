import { TextStream } from "@/components/stream/TextStream"
import type { AssistantMessage, MessagePart } from "@/state/chat-reducer"

type Props = {
  message: AssistantMessage
}

export function MessageItem({ message }: Props) {
  const isStreaming = message.status === "streaming"

  return (
    <article className="space-y-4">
      {/* User question */}
      <div className="flex justify-end">
        <div className="max-w-[80%] rounded-2xl bg-muted px-4 py-2 text-sm">
          {message.question}
        </div>
      </div>

      {/* Assistant parts */}
      <div className="space-y-3">
        {message.parts.map((part, i) => (
          <PartRenderer
            key={i}
            part={part}
            isLast={i === message.parts.length - 1}
            isStreaming={isStreaming}
          />
        ))}
        {message.error && (
          <p className="text-sm text-destructive" role="alert">
            {message.error}
          </p>
        )}
      </div>
    </article>
  )
}

function PartRenderer({
  part,
  isLast,
  isStreaming,
}: {
  part: MessagePart
  isLast: boolean
  isStreaming: boolean
}) {
  switch (part.kind) {
    case "text":
      return <TextStream content={part.content} isStreaming={isLast && isStreaming} />

    case "thinking":
      // Minimal placeholder — replaced by <ThinkingBlock> in step 10.
      return (
        <div className="border-l-2 border-muted pl-3 text-xs italic text-muted-foreground">
          {part.content}
        </div>
      )

    case "tool_call":
      // Minimal placeholder — replaced by <ToolCallCard> in step 10.
      return (
        <div className="rounded bg-muted p-2 font-mono text-xs">
          {part.name}() → {part.status}
        </div>
      )
  }
}
