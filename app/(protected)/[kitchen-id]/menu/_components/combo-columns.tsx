'use client'

import type { ReactNode } from 'react'
import type { ColumnDef, Row } from '@tanstack/react-table'
import { ListIcon } from 'lucide-react'
import { DropdownMenuItem } from '@/components/ui/dropdown-menu'
import { getSelectColumn } from '@/components/data-table/data-table-select-column'
import { DataTableRowActions } from '@/components/data-table/data-table-row-actions'
import type { ColumnConfig, Permission } from '@/lib/types/data-table'

export interface Combo {
  id: string
  kitchen_id: string
  brand_id: string
  name: string
  image_url: string | null
  pricing_type: 'fixed' | 'discounted'
  price: number | string
  is_active: boolean
  created_at: string
  updated_at: string
  brands: { id: string; name: string } | null
  combo_items: {
    id: string
    sort_order: number
    menu_item_id: string
    menu_items: { id: string; name: string } | null
  }[]
}

export const comboColumnConfigs: ColumnConfig[] = [
  { column: 'name', label: 'Name', type: 'text', sortable: true },
  { column: 'brands.name', label: 'Brand', type: 'text', sortable: true },
  { column: 'pricing_type', label: 'Pricing', type: 'text', sortable: true },
  { column: 'price', label: 'Price', type: 'number', sortable: true },
  { column: 'is_active', label: 'Active', type: 'boolean' },
  { column: 'created_at', label: 'Created', type: 'date', sortable: true },
]

function formatPrice(value: number | string) {
  const n = typeof value === 'string' ? Number(value) : value
  if (Number.isNaN(n)) return '—'
  return n.toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 3,
  })
}

export function getComboColumns(
  permissions: Permission,
  callbacks: {
    onEdit: (row: Row<Combo>) => void
    onDelete: (row: Row<Combo>) => void
    onManageItems: (row: Row<Combo>) => void
  }
): ColumnDef<Combo>[] {
  const showRowActions = Boolean(permissions.canEdit || permissions.canDelete)

  const extraItems = (row: Row<Combo>): ReactNode => (
    <DropdownMenuItem onClick={() => callbacks.onManageItems(row)}>
      <ListIcon />
      Manage Items
    </DropdownMenuItem>
  )

  return [
    getSelectColumn<Combo>(
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
      accessorKey: 'pricing_type',
      header: 'Pricing',
      cell: ({ row }) =>
        row.original.pricing_type === 'fixed' ? 'Fixed' : 'Discounted',
      enableSorting: true,
    },
    {
      accessorKey: 'price',
      header: 'Price',
      cell: ({ row }) => formatPrice(row.original.price),
      enableSorting: true,
    },
    {
      id: 'items_count',
      header: 'Items',
      cell: ({ row }) => row.original.combo_items?.length ?? 0,
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
