'use client'

import type { ReactNode } from 'react'
import type { ColumnDef, Row } from '@tanstack/react-table'
import { CheckCircleIcon, LayoutListIcon, RotateCcwIcon } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { DropdownMenuItem, DropdownMenuSeparator } from '@/components/ui/dropdown-menu'
import { getSelectColumn } from '@/components/data-table/data-table-select-column'
import { DataTableRowActions } from '@/components/data-table/data-table-row-actions'
import type { ColumnConfig, Permission } from '@/lib/types/data-table'

export interface Batch {
  id: string
  kitchen_id: string
  production_recipe_id: string
  recipe_version_id: string
  service_period_id: string | null
  target_quantity: string
  target_uom_id: string | null
  actual_quantity: string | null
  actual_uom_id: string | null
  cost_per_unit: string | null
  total_cost: string | null
  batch_id: string | null
  created_by: string
  created_at: string
  status: 'draft' | 'completed' | 'reversed'
  reversed_by: string | null
  reversed_at: string | null
  reversal_reason: string | null
  production_recipes: { id: string; name: string; storage_uom_id: string | null } | null
  production_recipe_versions: { id: string; version_number: number } | null
  production_service_periods: { id: string; name: string } | null
}

const STATUS_BADGE: Record<Batch['status'], { label: string; variant: 'secondary' | 'default' | 'destructive' | 'outline' }> = {
  draft: { label: 'Draft', variant: 'secondary' },
  completed: { label: 'Completed', variant: 'default' },
  reversed: { label: 'Reversed', variant: 'destructive' },
}

export const batchColumnConfigs: ColumnConfig[] = [
  { column: 'status', label: 'Status', type: 'text', sortable: true },
  { column: 'production_recipes.name', label: 'Recipe', type: 'text', sortable: true },
  { column: 'production_recipe_versions.version_number', label: 'Version', type: 'number', sortable: true },
  { column: 'production_service_periods.name', label: 'Service Period', type: 'text', sortable: true },
  { column: 'target_quantity', label: 'Target Qty', type: 'number', sortable: true },
  { column: 'actual_quantity', label: 'Actual Qty', type: 'number', sortable: true },
  { column: 'cost_per_unit', label: 'Cost/Unit', type: 'number', sortable: true },
  { column: 'total_cost', label: 'Total Cost', type: 'number', sortable: true },
  { column: 'created_at', label: 'Created', type: 'date', sortable: true },
]

export function getBatchColumns(
  permissions: Permission,
  callbacks: {
    onDelete: (row: Row<Batch>) => void
    onComplete: (row: Row<Batch>) => void
    onReverse: (row: Row<Batch>) => void
    onViewComponents: (row: Row<Batch>) => void
  }
): ColumnDef<Batch>[] {
  const showRowActions = Boolean(permissions.canEdit || permissions.canDelete)

  const extraItems = (row: Row<Batch>): ReactNode => {
    const { status } = row.original
    return (
      <>
        <DropdownMenuItem onClick={() => callbacks.onViewComponents(row)}>
          <LayoutListIcon />
          View Components
        </DropdownMenuItem>
        {status === 'draft' && (
          <DropdownMenuItem onClick={() => callbacks.onComplete(row)}>
            <CheckCircleIcon />
            Complete
          </DropdownMenuItem>
        )}
        {status === 'completed' && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={() => callbacks.onReverse(row)}
              className="text-destructive focus:text-destructive"
            >
              <RotateCcwIcon />
              Reverse
            </DropdownMenuItem>
          </>
        )}
      </>
    )
  }

  return [
    getSelectColumn<Batch>(
      showRowActions
        ? {
            renderRowEnd: (row) => (
              <DataTableRowActions
                row={row}
                permissions={{
                  canEdit: false,
                  canDelete: permissions.canDelete && row.original.status === 'draft',
                }}
                onEdit={() => {}}
                onDelete={callbacks.onDelete}
                extraItems={extraItems}
              />
            ),
          }
        : undefined
    ),
    {
      accessorKey: 'status',
      header: 'Status',
      cell: ({ row }) => {
        const cfg = STATUS_BADGE[row.original.status]
        return <Badge variant={cfg.variant}>{cfg.label}</Badge>
      },
      enableSorting: true,
    },
    {
      id: 'recipe_name',
      header: 'Recipe',
      cell: ({ row }) => row.original.production_recipes?.name ?? '—',
      enableSorting: false,
    },
    {
      id: 'version',
      header: 'Version',
      cell: ({ row }) => {
        const v = row.original.production_recipe_versions
        return v ? `v${v.version_number}` : '—'
      },
      enableSorting: false,
    },
    {
      id: 'service_period',
      header: 'Service Period',
      cell: ({ row }) =>
        row.original.production_service_periods?.name ?? '—',
      enableSorting: false,
    },
    {
      accessorKey: 'target_quantity',
      header: 'Target Qty',
      cell: ({ row }) => row.original.target_quantity,
      enableSorting: true,
    },
    {
      accessorKey: 'actual_quantity',
      header: 'Actual Qty',
      cell: ({ row }) => row.original.actual_quantity ?? '—',
      enableSorting: true,
    },
    {
      accessorKey: 'cost_per_unit',
      header: 'Cost/Unit',
      cell: ({ row }) => {
        const val = row.original.cost_per_unit
        return val != null ? `$${parseFloat(val).toFixed(4)}` : '—'
      },
      enableSorting: true,
    },
    {
      accessorKey: 'total_cost',
      header: 'Total Cost',
      cell: ({ row }) => {
        const val = row.original.total_cost
        return val != null ? `$${parseFloat(val).toFixed(2)}` : '—'
      },
      enableSorting: true,
    },
    {
      accessorKey: 'created_at',
      header: 'Created',
      cell: ({ row }) =>
        new Date(row.original.created_at).toLocaleDateString('en-US', {
          month: 'short',
          day: 'numeric',
          year: 'numeric',
        }),
      enableSorting: true,
    },
  ]
}
