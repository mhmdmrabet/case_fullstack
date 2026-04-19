import { useEffect, useState } from "react"

import type { DatasetInfo } from "@/types/datasets"

type State =
  | { status: "loading"; data: null; error: null }
  | { status: "success"; data: DatasetInfo[]; error: null }
  | { status: "error"; data: null; error: string }

export function useDatasets(): State {
  const [state, setState] = useState<State>({
    status: "loading",
    data: null,
    error: null,
  })

  useEffect(() => {
    let cancelled = false
    fetch("/api/datasets")
      .then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`)
        return r.json() as Promise<DatasetInfo[]>
      })
      .then((data) => {
        if (!cancelled) setState({ status: "success", data, error: null })
      })
      .catch((e) => {
        if (!cancelled) {
          setState({ status: "error", data: null, error: (e as Error).message })
        }
      })
    return () => {
      cancelled = true
    }
  }, [])

  return state
}
