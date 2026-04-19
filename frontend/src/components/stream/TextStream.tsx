import ReactMarkdown from "react-markdown"
import remarkGfm from "remark-gfm"

import { cn } from "@/lib/utils"

type Props = {
  content: string
  isStreaming?: boolean
  className?: string
}

/**
 * Renders a streaming text part as Markdown (bold, lists, inline code, links,
 * tables via GFM). A blinking caret hints at active streaming.
 */
export function TextStream({ content, isStreaming, className }: Props) {
  return (
    <div className={cn("text-base leading-relaxed", className)}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          p: ({ children }) => <p className="mb-2 last:mb-0">{children}</p>,
          strong: ({ children }) => (
            <strong className="font-semibold text-foreground">{children}</strong>
          ),
          em: ({ children }) => <em className="italic">{children}</em>,
          ul: ({ children }) => (
            <ul className="my-2 ml-5 list-disc space-y-1">{children}</ul>
          ),
          ol: ({ children }) => (
            <ol className="my-2 ml-5 list-decimal space-y-1">{children}</ol>
          ),
          li: ({ children }) => <li className="pl-1">{children}</li>,
          a: ({ children, href }) => (
            <a
              href={href}
              target="_blank"
              rel="noreferrer"
              className="text-primary underline underline-offset-2 hover:no-underline"
            >
              {children}
            </a>
          ),
          code: ({ children }) => (
            <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-[0.85em]">
              {children}
            </code>
          ),
          pre: ({ children }) => (
            <pre className="my-2 overflow-auto rounded-md bg-muted p-3 text-xs">
              {children}
            </pre>
          ),
          h1: ({ children }) => (
            <h1 className="mt-3 mb-2 text-lg font-semibold">{children}</h1>
          ),
          h2: ({ children }) => (
            <h2 className="mt-3 mb-2 text-base font-semibold">{children}</h2>
          ),
          h3: ({ children }) => (
            <h3 className="mt-2 mb-1 text-sm font-semibold">{children}</h3>
          ),
        }}
      >
        {content}
      </ReactMarkdown>
      {isStreaming && (
        <span
          aria-hidden
          className="ml-0.5 inline-block h-[1em] w-[2px] translate-y-[3px] bg-foreground animate-caret-blink motion-reduce:animate-none"
        />
      )}
    </div>
  )
}
