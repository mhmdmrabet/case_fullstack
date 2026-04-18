import { useState } from "react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Textarea } from "@/components/ui/textarea"
import { useChatStream } from "@/hooks/useChatStream"

function App() {
  const [question, setQuestion] = useState(
    "Combien de lignes dans le dataset sales ?",
  )
  const { state, send, stop } = useChatStream()
  const isStreaming = state.status === "streaming"

  return (
    <main className="mx-auto max-w-4xl px-6 py-12 space-y-6">
      <header>
        <h1 className="text-3xl font-semibold tracking-tight">case_fullstack</h1>
        <p className="text-muted-foreground mt-1 text-sm">
          Étape 8 — smoke test SSE (`useChatStream`). Les events arrivent dans l'état
          et s'impriment aussi dans la console navigateur.
        </p>
      </header>

      <div className="flex gap-2">
        <Textarea
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          placeholder="Pose une question…"
          className="min-h-[60px]"
          disabled={isStreaming}
        />
        {isStreaming ? (
          <Button onClick={stop} variant="destructive" className="cursor-pointer">
            Stop
          </Button>
        ) : (
          <Button
            onClick={() => send(question)}
            disabled={!question.trim()}
            className="cursor-pointer"
          >
            Send
          </Button>
        )}
      </div>

      <div className="text-xs text-muted-foreground">
        status: <Badge variant="secondary">{state.status}</Badge>
        {state.sessionId && (
          <span className="ml-2">
            session: <code>{state.sessionId.slice(0, 8)}…</code>
          </span>
        )}
      </div>

      {state.messages.map((msg) => (
        <Card key={msg.id}>
          <CardHeader>
            <CardTitle className="text-base">
              <Badge variant="outline" className="mr-2">
                {msg.status}
              </Badge>
              {msg.question}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <pre className="whitespace-pre-wrap text-xs bg-muted rounded p-3 overflow-auto max-h-[60vh]">
              {JSON.stringify(msg.parts, null, 2)}
            </pre>
            {msg.error && (
              <p className="text-destructive mt-2 text-sm">{msg.error}</p>
            )}
            {msg.usage && (
              <p className="text-muted-foreground mt-2 text-xs">
                Tokens in: {msg.usage.input_tokens} · out: {msg.usage.output_tokens}
              </p>
            )}
          </CardContent>
        </Card>
      ))}
    </main>
  )
}

export default App
