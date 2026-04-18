import { useEffect, useState } from "react"

import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"

type DatasetInfo = {
  name: string
  row_count: number
  columns: string[]
  dtypes: Record<string, string>
}

function App() {
  const [datasets, setDatasets] = useState<DatasetInfo[] | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetch("/api/datasets")
      .then((r) => r.json())
      .then(setDatasets)
      .catch((e) => setError(String(e)))
  }, [])

  return (
    <main className="mx-auto max-w-4xl px-6 py-12">
      <header className="mb-8">
        <h1 className="text-3xl font-semibold tracking-tight">
          case_fullstack
        </h1>
        <p className="text-muted-foreground mt-1">
          Frontend scaffold — Vite + React 19 + Tailwind 4 + shadcn/ui
        </p>
      </header>

      <section>
        <h2 className="text-xl font-medium mb-4">Datasets</h2>
        {error && (
          <Card className="border-destructive">
            <CardContent className="pt-6 text-destructive">
              Erreur : {error}
            </CardContent>
          </Card>
        )}
        {!error && !datasets && (
          <div className="space-y-3">
            <Skeleton className="h-24 w-full" />
            <Skeleton className="h-24 w-full" />
          </div>
        )}
        {datasets && (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {datasets.map((d) => (
              <Card key={d.name}>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <code className="text-sm">{d.name}</code>
                    <Badge variant="secondary">
                      {d.row_count} rows × {d.columns.length} cols
                    </Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">
                    {d.columns.slice(0, 6).join(", ")}
                    {d.columns.length > 6 ? "…" : ""}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </section>
    </main>
  )
}

export default App
