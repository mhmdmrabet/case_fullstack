import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import type { TablePayload } from "@/types/events"

type Props = {
  payload: TablePayload
}

export function TableRenderer({ payload }: Props) {
  const { columns, rows, total_rows, truncated } = payload

  if (rows.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        Résultat vide ({total_rows} rows).
      </p>
    )
  }

  return (
    <div className="space-y-2">
      <div className="max-h-80 overflow-auto rounded border">
        <Table>
          <TableHeader>
            <TableRow>
              {columns.map((col) => (
                <TableHead key={col} className="font-mono text-xs">
                  {col}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((row, i) => (
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
      {truncated && (
        <p className="text-xs text-muted-foreground">
          Affichage des {rows.length} premières lignes sur {total_rows}.
        </p>
      )}
    </div>
  )
}

function formatCell(value: unknown): string {
  if (value === null || value === undefined) return "—"
  if (typeof value === "number") {
    // Keep small integers as-is, round floats to 2 decimals.
    if (Number.isInteger(value)) return String(value)
    return value.toFixed(2)
  }
  return String(value)
}
