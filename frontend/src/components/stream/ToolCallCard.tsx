import { AlertCircle, BarChart3, CheckCircle2, Loader2, Wrench } from "lucide-react"

import { TableRenderer } from "@/components/stream/TableRenderer"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import type { ToolCallPart } from "@/state/chat-reducer"

type Props = {
  toolCall: ToolCallPart
}

export function ToolCallCard({ toolCall }: Props) {
  const sql = extractSql(toolCall)

  return (
    <Card className="animate-in fade-in slide-in-from-bottom-2 duration-300 motion-reduce:animate-none">
      <CardHeader className="flex-row items-center justify-between gap-2 space-y-0 pb-2">
        <div className="flex items-center gap-2">
          <Wrench className="size-4 text-muted-foreground" />
          <code className="text-sm font-medium">{toolCall.name}</code>
        </div>
        <StatusBadge status={toolCall.status} />
      </CardHeader>
      <CardContent className="space-y-3">
        {sql && (
          <pre className="overflow-auto rounded bg-muted p-3 text-xs font-mono leading-relaxed">
            {sql}
          </pre>
        )}

        {!sql && toolCall.argsDone && (
          <pre className="overflow-auto rounded bg-muted p-3 text-xs font-mono">
            {JSON.stringify(toolCall.argsDone, null, 2)}
          </pre>
        )}

        {toolCall.payload?.kind === "table" && (
          <TableRenderer payload={toolCall.payload} />
        )}

        {/* Figure payload is rendered in step 11 by PlotlyRenderer. */}
        {toolCall.payload?.kind === "figure" && (
          <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <BarChart3 className="size-3.5" />
            Figure prête (rendu Plotly en étape 11).
          </p>
        )}

        {toolCall.status === "error" && toolCall.summary && (
          <p className="text-sm text-destructive" role="alert">
            {toolCall.summary}
          </p>
        )}
      </CardContent>
    </Card>
  )
}

function StatusBadge({ status }: { status: ToolCallPart["status"] }) {
  if (status === "pending") {
    return (
      <Badge variant="secondary" className="gap-1">
        <Loader2 className="size-3 animate-spin motion-reduce:animate-none" />
        pending
      </Badge>
    )
  }
  if (status === "success") {
    return (
      <Badge variant="secondary" className="gap-1 bg-green-100 text-green-900 hover:bg-green-100 dark:bg-green-950 dark:text-green-100">
        <CheckCircle2 className="size-3" />
        done
      </Badge>
    )
  }
  return (
    <Badge variant="destructive" className="gap-1">
      <AlertCircle className="size-3" />
      error
    </Badge>
  )
}

/**
 * Try to extract a SQL query from the tool call args for pretty-printing.
 * Priority: streamed args (argsRaw, shown char-by-char if Claude) > argsDone.sql.
 */
function extractSql(toolCall: ToolCallPart): string | null {
  if (toolCall.argsRaw) {
    // Best-effort: parse the JSON-in-progress to extract sql
    const match = toolCall.argsRaw.match(/"sql"\s*:\s*"((?:[^"\\]|\\.)*)"?/)
    if (match?.[1]) return unescapeJson(match[1])
  }
  if (
    toolCall.argsDone &&
    typeof toolCall.argsDone === "object" &&
    "sql" in toolCall.argsDone &&
    typeof toolCall.argsDone.sql === "string"
  ) {
    return toolCall.argsDone.sql
  }
  return null
}

function unescapeJson(s: string): string {
  return s.replace(/\\n/g, "\n").replace(/\\"/g, '"').replace(/\\\\/g, "\\")
}
