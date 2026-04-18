/**
 * TypeScript mirror of backend/src/schemas/events.py.
 * Single source of truth is the backend; this file must stay in sync manually.
 */

export type UsageData = {
  input_tokens: number
  output_tokens: number
}

export type TablePayload = {
  kind: "table"
  title?: string
  columns: string[]
  rows: unknown[][]
  total_rows: number
  truncated: boolean
}

export type FigurePayload = {
  kind: "figure"
  title: string
  plotly: {
    data: unknown[]
    layout: Record<string, unknown>
  }
}

export type ToolResultPayload = TablePayload | FigurePayload

export type RunStartEvent = {
  type: "run.start"
  seq: number
  session_id: string
  message_id: string
  question: string
}

export type ThinkingDeltaEvent = {
  type: "thinking.delta"
  seq: number
  message_id: string
  delta: string
}

export type TextDeltaEvent = {
  type: "text.delta"
  seq: number
  message_id: string
  delta: string
}

export type ToolCallStartEvent = {
  type: "tool.call.start"
  seq: number
  tool_call_id: string
  tool_name: string
}

export type ToolCallArgsDeltaEvent = {
  type: "tool.call.args.delta"
  seq: number
  tool_call_id: string
  delta: string
}

export type ToolCallArgsDoneEvent = {
  type: "tool.call.args.done"
  seq: number
  tool_call_id: string
  args: Record<string, unknown> | string
}

export type ToolResultEvent = {
  type: "tool.result"
  seq: number
  tool_call_id: string
  tool_name: string
  status: "success" | "error"
  summary: string
  payload: ToolResultPayload | null
}

export type RunDoneEvent = {
  type: "run.done"
  seq: number
  usage: UsageData
}

export type ErrorEvent = {
  type: "error"
  seq: number
  code: string
  message: string
}

export type SseEvent =
  | RunStartEvent
  | ThinkingDeltaEvent
  | TextDeltaEvent
  | ToolCallStartEvent
  | ToolCallArgsDeltaEvent
  | ToolCallArgsDoneEvent
  | ToolResultEvent
  | RunDoneEvent
  | ErrorEvent
