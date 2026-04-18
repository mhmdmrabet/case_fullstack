import { cn } from "@/lib/utils"

type Props = {
  content: string
  isStreaming?: boolean
  className?: string
}

/**
 * Renders streaming text with a blinking caret while isStreaming is true.
 * Uses `whitespace-pre-wrap` so \n from the model render as line breaks.
 */
export function TextStream({ content, isStreaming, className }: Props) {
  return (
    <div className={cn("whitespace-pre-wrap leading-relaxed text-base", className)}>
      {content}
      {isStreaming && (
        <span
          aria-hidden
          className="ml-0.5 inline-block h-[1em] w-[2px] translate-y-[3px] bg-foreground animate-caret-blink motion-reduce:animate-none"
        />
      )}
    </div>
  )
}
