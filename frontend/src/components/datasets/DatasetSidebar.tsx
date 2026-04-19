import { Database } from "lucide-react"

import { DatasetItem } from "@/components/datasets/DatasetItem"
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuSkeleton,
} from "@/components/ui/sidebar"
import { useDatasets } from "@/hooks/useDatasets"

export function DatasetSidebar() {
  const datasets = useDatasets()

  return (
    <Sidebar collapsible="offcanvas">
      <SidebarHeader className="border-b">
        <div className="flex items-center gap-2 px-2 py-1.5">
          <Database className="size-4 text-muted-foreground" />
          <h2 className="text-sm font-semibold tracking-tight">Datasets</h2>
        </div>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {datasets.status === "loading" &&
                Array.from({ length: 3 }).map((_, i) => (
                  <SidebarMenuItem key={i}>
                    <SidebarMenuSkeleton showIcon />
                  </SidebarMenuItem>
                ))}

              {datasets.status === "error" && (
                <p className="px-3 py-2 text-xs text-destructive">
                  Erreur de chargement : {datasets.error}
                </p>
              )}

              {datasets.status === "success" &&
                datasets.data.map((d) => (
                  <SidebarMenuItem key={d.name}>
                    <DatasetItem dataset={d} />
                  </SidebarMenuItem>
                ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  )
}
