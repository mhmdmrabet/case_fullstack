import { TextStream } from "@/components/stream/TextStream"
import { ThinkingBlock } from "@/components/stream/ThinkingBlock"
import { ToolCallCard } from "@/components/stream/ToolCallCard"
import { TypingDots } from "@/components/stream/TypingDots"
import type { AssistantMessage, MessagePart } from "@/state/chat-reducer"

type Props = {
  message: AssistantMessage
}

export function MessageItem({ message }: Props) {
  const isStreaming = message.status === "streaming"
  const lastIndex = message.parts.length - 1

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
        {message.parts.length === 0 && isStreaming && <TypingDots />}
        {message.parts.map((part, i) => (
          <PartRenderer
            key={i}
            part={part}
            isLast={i === lastIndex}
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
      return (
        <ThinkingBlock
          content={part.content}
          isStreaming={isLast && isStreaming}
        />
      )

    case "tool_call":
      return <ToolCallCard toolCall={part} />
  }
}
