import { ChevronRight, Brain } from "lucide-react"
import { useState } from "react"

import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible"

type Props = {
  content: string
  /** If true, shows a subtle pulsing state to hint "still thinking". */
  isStreaming?: boolean
}

/**
 * Collapsible reasoning block. Closed by default (progressive disclosure,
 * convention from Claude.app / Perplexity).
 */
export function ThinkingBlock({ content, isStreaming }: Props) {
  const [open, setOpen] = useState(false)

  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <CollapsibleTrigger
        className="group flex cursor-pointer items-center gap-1.5 rounded px-2 py-1 text-xs text-muted-foreground hover:bg-muted"
        aria-label={open ? "Masquer le raisonnement" : "Afficher le raisonnement"}
      >
        <Brain className="size-3.5" />
        <span className="font-medium">
          {isStreaming ? "Réfléchit…" : "Raisonnement"}
        </span>
        <ChevronRight className="size-3 transition-transform group-data-[state=open]:rotate-90" />
      </CollapsibleTrigger>
      <CollapsibleContent className="overflow-hidden data-[state=open]:animate-collapsible-down data-[state=closed]:animate-collapsible-up">
        <div className="mt-2 whitespace-pre-wrap border-l-2 border-muted py-1 pl-3 text-sm italic text-muted-foreground">
          {content}
        </div>
      </CollapsibleContent>
    </Collapsible>
  )
}
