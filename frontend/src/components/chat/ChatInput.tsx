import { useEffect, useRef, useState, type KeyboardEvent } from "react"
import { Square, Send } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"

type Props = {
  onSend: (question: string) => void
  onStop: () => void
  isStreaming: boolean
}

/**
 * Multi-line composer. Keyboard conventions:
 *   Enter          → submit
 *   Shift+Enter    → newline
 *   Cmd/Ctrl+Enter → submit (alt)
 *   Esc            → stop streaming
 */
export function ChatInput({ onSend, onStop, isStreaming }: Props) {
  const [value, setValue] = useState("")
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  // Refocus the composer once a stream ends so the user can type the next question.
  useEffect(() => {
    if (!isStreaming) textareaRef.current?.focus()
  }, [isStreaming])

  const submit = () => {
    const trimmed = value.trim()
    if (!trimmed || isStreaming) return
    onSend(trimmed)
    setValue("")
  }

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      submit()
      return
    }
    if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
      e.preventDefault()
      submit()
      return
    }
    if (e.key === "Escape" && isStreaming) {
      e.preventDefault()
      onStop()
    }
  }

  return (
    <div className="border-t bg-background p-4">
      <div className="relative mx-auto max-w-3xl">
        <Textarea
          ref={textareaRef}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Pose une question sur tes datasets…"
          className="min-h-[80px] resize-none pr-28"
        />
        <div className="absolute bottom-3 right-3">
          {isStreaming ? (
            <Button
              onClick={onStop}
              variant="destructive"
              size="sm"
              className="cursor-pointer"
            >
              <Square className="mr-1 size-3 fill-current" />
              Stop
            </Button>
          ) : (
            <Button
              onClick={submit}
              disabled={!value.trim()}
              size="sm"
              className="cursor-pointer"
            >
              <Send className="mr-1 size-3" />
              Send
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}
