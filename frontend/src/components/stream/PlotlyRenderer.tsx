import { lazy, Suspense } from "react"

import { Skeleton } from "@/components/ui/skeleton"
import type { FigurePayload } from "@/types/events"

// Lazy-loaded to keep the initial bundle small. Plotly (~1.4 MB) is only
// fetched when the first figure payload arrives.
const Plot = lazy(() =>
  import("./plotly-factory").then((m) => ({ default: m.Plot })),
)

type Props = {
  payload: FigurePayload
}

export function PlotlyRenderer({ payload }: Props) {
  // IMPORTANT: parent must have a fixed or flex height or Plotly collapses to 0px.
  return (
    <figure className="h-[420px] w-full" role="group" aria-label={payload.title}>
      <Suspense fallback={<Skeleton className="h-full w-full rounded-md" />}>
        <Plot
          data={payload.plotly.data as Plotly.Data[]}
          layout={{
            ...payload.plotly.layout,
            autosize: true,
            margin: { l: 48, r: 16, t: 32, b: 40 },
          }}
          useResizeHandler
          config={{
            displayModeBar: false,
            responsive: true,
            // Disable Plotly telemetry / cloud edit links
            displaylogo: false,
          }}
          style={{ width: "100%", height: "100%" }}
        />
      </Suspense>
      <figcaption className="sr-only">{payload.title}</figcaption>
    </figure>
  )
}
