/**
 * Plotly entry — isolated in its own module so React.lazy() can code-split
 * this ~1.4 MB bundle out of the initial page load.
 *
 * Why we DIY the factory instead of `import Plot from "react-plotly.js"`:
 * react-plotly.js's main entry hard-imports `plotly.js/dist/plotly`. We alias
 * that to the lighter `plotly.js-cartesian-dist-min` (1.4 MB vs 4.8 MB), but
 * that aliased UMD bundle exposes Plotly differently from what react-plotly.js
 * expects, breaking the main entry. The factory pattern lets us pass our
 * Plotly module explicitly.
 *
 * The interop unwrap below handles all bundler shapes: ESM default, CJS
 * `__esModule` default, raw function, double-wrapped, etc.
 */

import type { ComponentType } from "react"
import type { PlotParams } from "react-plotly.js"

// @ts-expect-error — plotly.js-cartesian-dist-min ships no types
import * as plotlyModule from "plotly.js-cartesian-dist-min"
import * as factoryModule from "react-plotly.js/factory"

type FactoryFn = (plotly: unknown) => ComponentType<PlotParams>

function unwrap<T>(mod: unknown): T {
  if (typeof mod === "function") return mod as T
  const obj = mod as { default?: unknown } | undefined
  if (obj?.default !== undefined) return unwrap<T>(obj.default)
  return mod as T
}

const createPlotlyComponent = unwrap<FactoryFn>(factoryModule)
const Plotly = unwrap<unknown>(plotlyModule)

export const Plot = createPlotlyComponent(Plotly)
