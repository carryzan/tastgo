'use client'

import type { ReactNode } from 'react'
import type { ColumnDef, Row } from '@tanstack/react-table'
import { ListIcon } from 'lucide-react'
import { DropdownMenuItem } from '@/components/ui/dropdown-menu'
import { getSelectColumn } from '@/components/data-table/data-table-select-column'
import { DataTableRowActions } from '@/components/data-table/data-table-row-actions'
import type { ColumnConfig, Permission } from '@/lib/types/data-table'

export interface ModifierGroup {
  id: string
  kitchen_id: string
  brand_id: string
  name: string
  min_selections: number
  max_selections: number | null
  is_active: boolean
  created_at: string
  brands: { id: string; name: string } | null
  modifier_options: { id: string }[]
}

export const modifierGroupColumnConfigs: ColumnConfig[] = [
  { column: 'name', label: 'Name', type: 'text', sortable: true },
  { column: 'brands.name', label: 'Brand', type: 'text', sortable: true },
  { column: 'min_selections', label: 'Min', type: 'number', sortable: true },
  { column: 'max_selections', label: 'Max', type: 'number', sortable: true },
  { column: 'is_active', label: 'Active', type: 'boolean' },
  { column: 'created_at', label: 'Created', type: 'date', sortable: true },
]

export function getModifierGroupColumns(
  permissions: Permission,
  callbacks: {
    onEdit: (row: Row<ModifierGroup>) => void
    onDelete: (row: Row<ModifierGroup>) => void
    onManageOptions: (row: Row<ModifierGroup>) => void
  }
): ColumnDef<ModifierGroup>[] {
  const showRowActions = Boolean(permissions.canEdit || permissions.canDelete)

  const extraItems = (row: Row<ModifierGroup>): ReactNode => (
    <DropdownMenuItem onClick={() => callbacks.onManageOptions(row)}>
      <ListIcon />
      Manage Options
    </DropdownMenuItem>
  )

  return [
    getSelectColumn<ModifierGroup>(
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
      id: 'brands.name',
      accessorFn: (row) => row.brands?.name ?? '',
      header: 'Brand',
      cell: ({ row }) => row.original.brands?.name ?? '—',
      enableSorting: true,
    },
    {
      accessorKey: 'min_selections',
      header: 'Min selections',
      enableSorting: true,
    },
    {
      id: 'max_selections',
      header: 'Max selections',
      cell: ({ row }) =>
        row.original.max_selections == null
          ? '—'
          : row.original.max_selections,
      enableSorting: true,
    },
    {
      id: 'options_count',
      header: 'Options',
      cell: ({ row }) => row.original.modifier_options?.length ?? 0,
      enableSorting: false,
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
