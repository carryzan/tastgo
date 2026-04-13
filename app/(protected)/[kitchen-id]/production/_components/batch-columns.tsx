'use client'

import type { ReactNode } from 'react'
import type { ColumnDef, Row } from '@tanstack/react-table'
import { CheckCircleIcon } from 'lucide-react'
import { DropdownMenuItem } from '@/components/ui/dropdown-menu'
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
  actual_quantity: string | null
  cost_per_unit: string | null
  total_cost: string | null
  batch_id: string | null
  created_by: string
  created_at: string
  production_recipes: { id: string; name: string } | null
  production_recipe_versions: { id: string; version_number: number } | null
  production_service_periods: { id: string; name: string } | null
}

export const batchColumnConfigs: ColumnConfig[] = [
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
  }
): ColumnDef<Batch>[] {
  const showRowActions = Boolean(permissions.canEdit || permissions.canDelete)

  const extraItems = (row: Row<Batch>): ReactNode => {
    if (row.original.actual_quantity != null) return null
    return (
      <DropdownMenuItem onClick={() => callbacks.onComplete(row)}>
        <CheckCircleIcon />
        Complete
      </DropdownMenuItem>
    )
  }

  return [
    getSelectColumn<Batch>(
      showRowActions
        ? {
            renderRowEnd: (row) => (
              <DataTableRowActions
                row={row}
                permissions={{ canEdit: false, canDelete: permissions.canDelete }}
                onEdit={() => {}}
                onDelete={callbacks.onDelete}
                extraItems={extraItems}
              />
            ),
          }
        : undefined
    ),
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
