import { AlertCircle, CheckCircle2, Loader2, Wrench } from "lucide-react"

import { PlotlyRenderer } from "@/components/stream/PlotlyRenderer"
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
            {prettyArgs(toolCall.argsDone)}
          </pre>
        )}

        {toolCall.payload?.kind === "table" && (
          <TableRenderer payload={toolCall.payload} />
        )}

        {toolCall.payload?.kind === "figure" && (
          <PlotlyRenderer payload={toolCall.payload} />
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
 * Handles three shapes:
 *   1. Streamed args (argsRaw) — Claude streams JSON char-by-char
 *   2. argsDone as dict — Gemini path
 *   3. argsDone as JSON string — OpenAI path (stringified function arguments)
 */
function extractSql(toolCall: ToolCallPart): string | null {
  if (toolCall.argsRaw) {
    const match = toolCall.argsRaw.match(/"sql"\s*:\s*"((?:[^"\\]|\\.)*)"?/)
    if (match?.[1]) return unescapeJson(match[1])
  }

  const args = parseArgs(toolCall.argsDone)
  if (args && typeof args.sql === "string") return args.sql

  return null
}

function parseArgs(
  argsDone: ToolCallPart["argsDone"],
): Record<string, unknown> | null {
  if (!argsDone) return null
  if (typeof argsDone === "object") return argsDone as Record<string, unknown>
  try {
    const parsed = JSON.parse(argsDone)
    return typeof parsed === "object" && parsed !== null ? parsed : null
  } catch {
    return null
  }
}

function unescapeJson(s: string): string {
  return s.replace(/\\n/g, "\n").replace(/\\"/g, '"').replace(/\\\\/g, "\\")
}

function prettyArgs(argsDone: ToolCallPart["argsDone"]): string {
  const parsed = parseArgs(argsDone)
  if (parsed) return JSON.stringify(parsed, null, 2)
  return typeof argsDone === "string" ? argsDone : JSON.stringify(argsDone, null, 2)
}
