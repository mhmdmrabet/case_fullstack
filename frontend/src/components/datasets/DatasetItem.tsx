import { Eye, Loader2 } from "lucide-react"
import { useState } from "react"

import { DatasetPreviewPopover } from "@/components/datasets/DatasetPreviewPopover"
import { Badge } from "@/components/ui/badge"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import type { DatasetInfo, DatasetPreview } from "@/types/datasets"

type Props = {
  dataset: DatasetInfo
}

export function DatasetItem({ dataset }: Props) {
  const [open, setOpen] = useState(false)
  const [preview, setPreview] = useState<DatasetPreview | null>(null)
  const [loading, setLoading] = useState(false)

  const fetchPreview = async () => {
    if (preview || loading) return
    setLoading(true)
    try {
      const r = await fetch(`/api/datasets/${dataset.name}/preview`)
      if (r.ok) setPreview((await r.json()) as DatasetPreview)
    } finally {
      setLoading(false)
    }
  }

  const handleOpen = (next: boolean) => {
    setOpen(next)
    if (next) void fetchPreview()
  }

  return (
    <div className="rounded-md p-2 transition-colors hover:bg-muted">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <code className="block truncate text-sm font-medium">
            {dataset.name}
          </code>
          <Badge variant="secondary" className="mt-1 text-xs">
            {dataset.row_count.toLocaleString("fr-FR")} × {dataset.columns.length}
          </Badge>
        </div>
        <Popover open={open} onOpenChange={handleOpen}>
          <PopoverTrigger
            className="inline-flex size-7 cursor-pointer items-center justify-center rounded-md text-muted-foreground hover:bg-accent hover:text-accent-foreground"
            aria-label={`Aperçu de ${dataset.name}`}
          >
            {loading ? (
              <Loader2 className="size-3.5 animate-spin" />
            ) : (
              <Eye className="size-3.5" />
            )}
          </PopoverTrigger>
          <PopoverContent side="right" align="start" className="w-120 p-0">
            <DatasetPreviewPopover
              dataset={dataset}
              preview={preview}
              loading={loading}
            />
          </PopoverContent>
        </Popover>
      </div>
    </div>
  )
}
