/**
 * SSE stream client built on top of fetch + ReadableStream + eventsource-parser.
 * Handles the two WHATWG SSE rules we care about:
 *  - `data:` values that span multiple lines are joined with `\n`
 *  - partial chunks are buffered until a complete event arrives
 *
 * AbortController: pass a signal via `options.signal` to cancel mid-stream.
 */

import { createParser, type EventSourceMessage } from "eventsource-parser"

export type SseHandlers = {
  signal?: AbortSignal
  onEvent: (message: EventSourceMessage) => void
}

export async function streamSse(
  url: string,
  init: RequestInit,
  handlers: SseHandlers,
): Promise<void> {
  const response = await fetch(url, {
    ...init,
    headers: {
      ...(init.headers ?? {}),
      Accept: "text/event-stream",
    },
    signal: handlers.signal,
  })

  if (!response.ok) {
    throw new Error(`SSE request failed: HTTP ${response.status}`)
  }
  if (!response.body) {
    throw new Error("SSE request returned no body")
  }

  const parser = createParser({ onEvent: handlers.onEvent })
  const reader = response.body.pipeThrough(new TextDecoderStream()).getReader()

  try {
    while (true) {
      const { value, done } = await reader.read()
      if (done) break
      parser.feed(value)
    }
  } finally {
    reader.releaseLock()
  }
}
