import { ChatInput } from "@/components/chat/ChatInput"
import { MessageList } from "@/components/chat/MessageList"
import { DatasetSidebar } from "@/components/datasets/DatasetSidebar"
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar"
import { Toaster } from "@/components/ui/sonner"
import { useChatStream } from "@/hooks/useChatStream"

export function ChatView() {
  const { state, send, stop } = useChatStream()
  const isStreaming = state.status === "streaming"

  return (
    <SidebarProvider>
      <DatasetSidebar />

      <SidebarInset className="flex h-dvh flex-col">
        <header className="flex items-center gap-2 border-b px-4 py-3">
          <SidebarTrigger className="cursor-pointer" />
          <div>
            <h1 className="text-lg font-semibold tracking-tight">case_fullstack</h1>
            <p className="text-xs text-muted-foreground">
              Analyse de données — SQL via DuckDB, visualisations Plotly
            </p>
          </div>
        </header>

        <MessageList messages={state.messages} onSendPrompt={send} />

        <ChatInput onSend={send} onStop={stop} isStreaming={isStreaming} />
      </SidebarInset>

      <Toaster richColors position="top-right" />
    </SidebarProvider>
  )
}
