import { Sparkles } from "lucide-react"

import { Button } from "@/components/ui/button"

const SUGGESTED_PROMPTS = [
  "Quels sont les 10 clients les plus à risque de churn ?",
  "Montre l'évolution des ventes mensuelles par produit en 2024",
  "Compare le prix moyen des voitures par marque et carburant",
] as const

type Props = {
  onSendPrompt: (prompt: string) => void
}

export function EmptyState({ onSendPrompt }: Props) {
  return (
    <div className="flex flex-1 items-center justify-center px-4">
      <div className="w-full max-w-xl space-y-6 text-center">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight">
            Que veux-tu analyser ?
          </h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Pose une question en français — ou choisis un exemple ci-dessous.
          </p>
        </div>

        <div className="flex flex-col gap-2">
          {SUGGESTED_PROMPTS.map((prompt) => (
            <Button
              key={prompt}
              variant="outline"
              onClick={() => onSendPrompt(prompt)}
              className="h-auto cursor-pointer justify-start whitespace-normal px-4 py-3 text-left text-sm font-normal"
            >
              <Sparkles className="mr-2 size-3.5 shrink-0 text-muted-foreground" />
              {prompt}
            </Button>
          ))}
        </div>
      </div>
    </div>
  )
}
