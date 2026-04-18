import { ChatInput } from "@/components/chat/ChatInput"
import { MessageList } from "@/components/chat/MessageList"
import { useChatStream } from "@/hooks/useChatStream"

export function ChatView() {
  const { state, send, stop } = useChatStream()
  const isStreaming = state.status === "streaming"

  return (
    <div className="flex h-dvh flex-col">
      <header className="border-b px-4 py-3">
        <div className="mx-auto max-w-3xl">
          <h1 className="text-lg font-semibold tracking-tight">case_fullstack</h1>
          <p className="text-xs text-muted-foreground">
            Analyse de données — SQL via DuckDB, visualisations Plotly
          </p>
        </div>
      </header>

      <MessageList messages={state.messages} />

      <ChatInput onSend={send} onStop={stop} isStreaming={isStreaming} />
    </div>
  )
}
