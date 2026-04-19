import { Skeleton } from "@/components/ui/skeleton"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import type { DatasetInfo, DatasetPreview } from "@/types/datasets"

type Props = {
  dataset: DatasetInfo
  preview: DatasetPreview | null
  loading: boolean
}

export function DatasetPreviewPopover({ dataset, preview, loading }: Props) {
  return (
    <div className="space-y-3 p-4">
      <header>
        <code className="text-sm font-semibold">{dataset.name}</code>
        <p className="text-xs text-muted-foreground">
          {dataset.row_count.toLocaleString("fr-FR")} lignes × {dataset.columns.length} colonnes
        </p>
      </header>

      {loading && !preview && (
        <div className="space-y-2">
          <Skeleton className="h-8 w-full" />
          <Skeleton className="h-8 w-full" />
          <Skeleton className="h-8 w-full" />
        </div>
      )}

      {preview && (
        <div className="max-h-72 overflow-auto rounded border">
          <Table>
            <TableHeader>
              <TableRow>
                {preview.columns.map((col) => (
                  <TableHead key={col} className="font-mono text-[10px] uppercase">
                    <div>{col}</div>
                    <div className="text-muted-foreground/70 normal-case">
                      {preview.dtypes[col]}
                    </div>
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {preview.rows.map((row, i) => (
                <TableRow key={i}>
                  {row.map((cell, j) => (
                    <TableCell key={j} className="font-mono text-xs">
                      {formatCell(cell)}
                    </TableCell>
                  ))}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  )
}

function formatCell(value: unknown): string {
  if (value === null || value === undefined) return "—"
  if (typeof value === "number") {
    return Number.isInteger(value) ? String(value) : value.toFixed(2)
  }
  return String(value)
}
