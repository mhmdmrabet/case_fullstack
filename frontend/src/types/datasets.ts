export type DatasetInfo = {
  name: string
  row_count: number
  columns: string[]
  dtypes: Record<string, string>
}

export type DatasetPreview = DatasetInfo & {
  rows: unknown[][]
}
