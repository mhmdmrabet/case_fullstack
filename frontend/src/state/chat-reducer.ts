import type {
  SseEvent,
  ToolResultPayload,
  UsageData,
} from "@/types/events"

// ---------------------------------------------------------------------------
// Domain types
// ---------------------------------------------------------------------------

export type ThinkingPart = { kind: "thinking"; content: string }
export type TextPart = { kind: "text"; content: string }
export type ToolCallPart = {
  kind: "tool_call"
  id: string
  name: string
  argsRaw: string
  argsDone: Record<string, unknown> | string | null
  status: "pending" | "success" | "error"
  summary?: string
  payload: ToolResultPayload | null
}

export type MessagePart = ThinkingPart | TextPart | ToolCallPart

export type RunStatus = "idle" | "streaming" | "done" | "error"

export type AssistantMessage = {
  id: string
  question: string
  parts: MessagePart[]
  status: RunStatus
  error?: string
  usage?: UsageData
}

export type ChatState = {
  sessionId: string | null
  messages: AssistantMessage[]
  status: RunStatus
}

export const initialChatState: ChatState = {
  sessionId: null,
  messages: [],
  status: "idle",
}

// ---------------------------------------------------------------------------
// Actions
// ---------------------------------------------------------------------------

export type ChatAction =
  | { type: "RUN_START"; sessionId: string; messageId: string; question: string }
  | { type: "THINKING_DELTA"; messageId: string; delta: string }
  | { type: "TEXT_DELTA"; messageId: string; delta: string }
  | { type: "TOOL_CALL_START"; toolCallId: string; toolName: string }
  | { type: "TOOL_CALL_ARGS_DELTA"; toolCallId: string; delta: string }
  | {
      type: "TOOL_CALL_ARGS_DONE"
      toolCallId: string
      args: Record<string, unknown> | string
    }
  | {
      type: "TOOL_RESULT"
      toolCallId: string
      toolName: string
      status: "success" | "error"
      summary: string
      payload: ToolResultPayload | null
    }
  | { type: "RUN_DONE"; usage: UsageData }
  | { type: "ERROR"; message: string }

// ---------------------------------------------------------------------------
// SseEvent → ChatAction
// ---------------------------------------------------------------------------

export function toAction(evt: SseEvent): ChatAction {
  switch (evt.type) {
    case "run.start":
      return {
        type: "RUN_START",
        sessionId: evt.session_id,
        messageId: evt.message_id,
        question: evt.question,
      }
    case "thinking.delta":
      return { type: "THINKING_DELTA", messageId: evt.message_id, delta: evt.delta }
    case "text.delta":
      return { type: "TEXT_DELTA", messageId: evt.message_id, delta: evt.delta }
    case "tool.call.start":
      return {
        type: "TOOL_CALL_START",
        toolCallId: evt.tool_call_id,
        toolName: evt.tool_name,
      }
    case "tool.call.args.delta":
      return {
        type: "TOOL_CALL_ARGS_DELTA",
        toolCallId: evt.tool_call_id,
        delta: evt.delta,
      }
    case "tool.call.args.done":
      return {
        type: "TOOL_CALL_ARGS_DONE",
        toolCallId: evt.tool_call_id,
        args: evt.args,
      }
    case "tool.result":
      return {
        type: "TOOL_RESULT",
        toolCallId: evt.tool_call_id,
        toolName: evt.tool_name,
        status: evt.status,
        summary: evt.summary,
        payload: evt.payload,
      }
    case "run.done":
      return { type: "RUN_DONE", usage: evt.usage }
    case "error":
      return { type: "ERROR", message: evt.message }
  }
}

// ---------------------------------------------------------------------------
// Reducer
// ---------------------------------------------------------------------------

export function chatReducer(state: ChatState, action: ChatAction): ChatState {
  switch (action.type) {
    case "RUN_START":
      return {
        ...state,
        sessionId: action.sessionId,
        status: "streaming",
        messages: [
          ...state.messages,
          {
            id: action.messageId,
            question: action.question,
            parts: [],
            status: "streaming",
          },
        ],
      }

    case "THINKING_DELTA":
      return updateLastMessage(state, (m) => ({
        ...m,
        parts: appendToLastPart(m.parts, "thinking", action.delta),
      }))

    case "TEXT_DELTA":
      return updateLastMessage(state, (m) => ({
        ...m,
        parts: appendToLastPart(m.parts, "text", action.delta),
      }))

    case "TOOL_CALL_START":
      return updateLastMessage(state, (m) => ({
        ...m,
        parts: [
          ...m.parts,
          {
            kind: "tool_call",
            id: action.toolCallId,
            name: action.toolName,
            argsRaw: "",
            argsDone: null,
            status: "pending",
            payload: null,
          },
        ],
      }))

    case "TOOL_CALL_ARGS_DELTA":
      return updateToolCall(state, action.toolCallId, (t) => ({
        ...t,
        argsRaw: t.argsRaw + action.delta,
      }))

    case "TOOL_CALL_ARGS_DONE":
      return updateToolCall(state, action.toolCallId, (t) => ({
        ...t,
        argsDone: action.args,
      }))

    case "TOOL_RESULT":
      return updateToolCall(state, action.toolCallId, (t) => ({
        ...t,
        status: action.status,
        summary: action.summary,
        payload: action.payload,
      }))

    case "RUN_DONE":
      return {
        ...state,
        status: "done",
        messages: state.messages.map((m, i) =>
          i === state.messages.length - 1
            ? { ...m, status: "done", usage: action.usage }
            : m,
        ),
      }

    case "ERROR":
      return {
        ...state,
        status: "error",
        messages: state.messages.map((m, i) =>
          i === state.messages.length - 1
            ? { ...m, status: "error", error: action.message }
            : m,
        ),
      }
  }
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function updateLastMessage(
  state: ChatState,
  updater: (m: AssistantMessage) => AssistantMessage,
): ChatState {
  if (state.messages.length === 0) return state
  const last = state.messages.length - 1
  return {
    ...state,
    messages: state.messages.map((m, i) => (i === last ? updater(m) : m)),
  }
}

function appendToLastPart(
  parts: MessagePart[],
  kind: "thinking" | "text",
  delta: string,
): MessagePart[] {
  const last = parts[parts.length - 1]
  if (last?.kind === kind) {
    return [
      ...parts.slice(0, -1),
      { ...last, content: last.content + delta } as MessagePart,
    ]
  }
  return [...parts, { kind, content: delta }]
}

function updateToolCall(
  state: ChatState,
  toolCallId: string,
  updater: (t: ToolCallPart) => ToolCallPart,
): ChatState {
  return updateLastMessage(state, (m) => ({
    ...m,
    parts: m.parts.map((p) =>
      p.kind === "tool_call" && p.id === toolCallId ? updater(p) : p,
    ),
  }))
}
