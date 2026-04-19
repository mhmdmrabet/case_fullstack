import { useCallback, useReducer, useRef } from "react"
import { toast } from "sonner"

import { streamSse } from "@/lib/sse"
import {
  chatReducer,
  initialChatState,
  toAction,
  type ChatState,
} from "@/state/chat-reducer"
import type { SseEvent } from "@/types/events"

const CHAT_STREAM_URL = "/api/chat/stream"

export type UseChatStream = {
  state: ChatState
  send: (question: string) => Promise<void>
  stop: () => void
}

export function useChatStream(): UseChatStream {
  const [state, dispatch] = useReducer(chatReducer, initialChatState)
  const sessionRef = useRef<string | null>(null)
  const abortRef = useRef<AbortController | null>(null)

  const send = useCallback(async (question: string) => {
    abortRef.current?.abort()
    const controller = new AbortController()
    abortRef.current = controller

    try {
      await streamSse(
        CHAT_STREAM_URL,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            question,
            session_id: sessionRef.current,
          }),
        },
        {
          signal: controller.signal,
          onEvent: (msg) => {
            if (!msg.event || !msg.data) return
            const evt = JSON.parse(msg.data) as SseEvent
            if (evt.type === "run.start") {
              sessionRef.current = evt.session_id
            }
            if (evt.type === "error") {
              toast.error("L'agent a rencontré une erreur", {
                description: evt.message.slice(0, 200),
              })
            }
            dispatch(toAction(evt))
          },
        },
      )
    } catch (err) {
      if ((err as Error).name === "AbortError") {
        // User clicked Stop (or navigated away). Flip status back to "done"
        // so the composer becomes interactive again.
        dispatch({ type: "STOPPED" })
        return
      }
      const message = (err as Error).message
      toast.error("Connexion interrompue", { description: message })
      dispatch({ type: "ERROR", message })
    }
  }, [])

  const stop = useCallback(() => {
    abortRef.current?.abort()
  }, [])

  return { state, send, stop }
}
