'use client'

import type { ReactNode } from 'react'
import type { ColumnDef, Row } from '@tanstack/react-table'
import { BookOpenIcon, PlusCircleIcon, ScaleIcon } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { DropdownMenuItem } from '@/components/ui/dropdown-menu'
import { getSelectColumn } from '@/components/data-table/data-table-select-column'
import { DataTableRowActions } from '@/components/data-table/data-table-row-actions'
import type { ColumnConfig, Permission } from '@/lib/types/data-table'

export interface Recipe {
  id: string
  kitchen_id: string
  name: string
  track_stock: boolean
  storage_uom_id: string | null
  current_version_id: string | null
  variance_tolerance_percentage: string | null
  is_active: boolean
  created_at: string
  updated_at: string
  production_recipe_versions: { id: string; version_number: number }[]
}

export const recipeColumnConfigs: ColumnConfig[] = [
  { column: 'name', label: 'Name', type: 'text', sortable: true },
  { column: 'track_stock', label: 'Track Stock', type: 'boolean' },
  {
    column: 'variance_tolerance_percentage',
    label: 'Variance %',
    type: 'number',
    sortable: true,
  },
  { column: 'is_active', label: 'Active', type: 'boolean' },
  { column: 'created_at', label: 'Created', type: 'date', sortable: true },
]

export function getRecipeColumns(
  permissions: Permission,
  callbacks: {
    onEdit: (row: Row<Recipe>) => void
    onDelete: (row: Row<Recipe>) => void
    onVersionHistory: (row: Row<Recipe>) => void
    onNewVersion: (row: Row<Recipe>) => void
    onUomConfig: (row: Row<Recipe>) => void
  }
): ColumnDef<Recipe>[] {
  const showRowActions = Boolean(permissions.canEdit || permissions.canDelete)

  const extraItems = (row: Row<Recipe>): ReactNode => (
    <>
      <DropdownMenuItem onClick={() => callbacks.onVersionHistory(row)}>
        <BookOpenIcon />
        Version History
      </DropdownMenuItem>
      <DropdownMenuItem onClick={() => callbacks.onNewVersion(row)}>
        <PlusCircleIcon />
        New Version
      </DropdownMenuItem>
      {row.original.track_stock && (
        <DropdownMenuItem onClick={() => callbacks.onUomConfig(row)}>
          <ScaleIcon />
          UOM Conversions
        </DropdownMenuItem>
      )}
    </>
  )

  return [
    getSelectColumn<Recipe>(
      showRowActions
        ? {
            renderRowEnd: (row) => (
              <DataTableRowActions
                row={row}
                permissions={permissions}
                onEdit={callbacks.onEdit}
                onDelete={callbacks.onDelete}
                extraItems={extraItems}
              />
            ),
          }
        : undefined
    ),
    {
      accessorKey: 'name',
      header: 'Name',
      cell: ({ row }) => (
        <span className="font-medium">{row.original.name}</span>
      ),
      enableSorting: true,
    },
    {
      id: 'track_stock',
      header: 'Track Stock',
      cell: ({ row }) =>
        row.original.track_stock ? (
          <Badge variant="default">Tracked</Badge>
        ) : (
          <Badge variant="outline">Untracked</Badge>
        ),
      enableSorting: false,
    },
    {
      id: 'version',
      header: 'Version',
      cell: ({ row }) => {
        const { current_version_id, production_recipe_versions } = row.original
        if (!current_version_id) return '—'
        const v = production_recipe_versions.find(
          (v) => v.id === current_version_id
        )
        return v ? `v${v.version_number}` : '—'
      },
      enableSorting: false,
    },
    {
      accessorKey: 'variance_tolerance_percentage',
      header: 'Variance %',
      cell: ({ row }) => {
        const val = row.original.variance_tolerance_percentage
        return val != null ? `${val}%` : '—'
      },
      enableSorting: true,
    },
    {
      accessorKey: 'is_active',
      header: 'Status',
      cell: ({ row }) => (row.original.is_active ? 'Active' : 'Inactive'),
      enableSorting: false,
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
