'use client'

import type { ReactNode } from 'react'
import type { ColumnDef, Row } from '@tanstack/react-table'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { getSelectColumn } from '@/components/data-table/data-table-select-column'
import { DataTableRowActions } from '@/components/data-table/data-table-row-actions'
import type { ColumnConfig, Permission } from '@/lib/types/data-table'

export interface InventoryItem {
  id: string
  kitchen_id: string
  category_id: string | null
  name: string
  image_url: string | null
  yield_percentage: number
  par_level: number | null
  min_level: number | null
  max_level: number | null
  cycle_count_frequency: string | null
  location_label: string | null
  is_active: boolean
  created_at: string
  updated_at: string
  category_name: string | null
  storage_uom_id: string | null
  storage_uom_abbreviation: string | null
  current_quantity: string | number
  stock_value: string | number
}

const CYCLE_COUNT_LABELS: Record<string, string> = {
  daily: 'Daily',
  every_few_days: 'Every few days',
  weekly: 'Weekly',
  biweekly: 'Biweekly',
  monthly: 'Monthly',
}

export const inventoryColumnConfigs: ColumnConfig[] = [
  { column: 'name', label: 'Name', type: 'text', sortable: true },
  { column: 'category_name', label: 'Category', type: 'text', sortable: true },
  { column: 'yield_percentage', label: 'Yield %', type: 'number', sortable: true },
  { column: 'par_level', label: 'Par Level', type: 'number', sortable: true },
  { column: 'min_level', label: 'Min Level', type: 'number', sortable: true },
  { column: 'max_level', label: 'Max Level', type: 'number', sortable: true },
  { column: 'cycle_count_frequency', label: 'Cycle Count', type: 'select', options: Object.keys(CYCLE_COUNT_LABELS) },
  { column: 'location_label', label: 'Location', type: 'text', sortable: true },
  { column: 'current_quantity', label: 'Stock', type: 'number', sortable: true },
  { column: 'stock_value', label: 'Value', type: 'number', sortable: true },
  { column: 'is_active', label: 'Active', type: 'boolean' },
  { column: 'created_at', label: 'Created', type: 'date', sortable: true },
]

function formatNumber(value: string | number | null) {
  if (value == null) return '—'
  const n = Number(value)
  if (Number.isNaN(n)) return '—'
  return n.toLocaleString(undefined, { maximumFractionDigits: 4 })
}

function formatMoney(value: string | number | null) {
  if (value == null) return '—'
  const n = Number(value)
  if (Number.isNaN(n)) return '—'
  return n.toLocaleString(undefined, {
    minimumFractionDigits: 0,
    maximumFractionDigits: 3,
  })
}

export function getInventoryColumns(
  permissions: Permission,
  callbacks: {
    onEdit: (row: Row<InventoryItem>) => void
    onDelete: (row: Row<InventoryItem>) => void
    extraItems?: (row: Row<InventoryItem>) => ReactNode
  }
): ColumnDef<InventoryItem>[] {
  const showRowActions = Boolean(permissions.canEdit || permissions.canDelete)

  return [
    getSelectColumn<InventoryItem>(
      showRowActions
        ? {
            renderRowEnd: (row) => (
              <DataTableRowActions
                row={row}
                permissions={permissions}
                onEdit={callbacks.onEdit}
                onDelete={callbacks.onDelete}
                extraItems={callbacks.extraItems}
              />
            ),
          }
        : undefined
    ),
    {
      accessorKey: 'name',
      header: 'Name',
      cell: ({ row }) => {
        const { name, image_url } = row.original
        return (
          <div className="flex items-center gap-2">
            <Avatar size="sm">
              {image_url && <AvatarImage src={image_url} alt={name} />}
              <AvatarFallback>
                {name.charAt(0).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <span className="font-medium">{name}</span>
          </div>
        )
      },
      enableSorting: true,
    },
    {
      accessorKey: 'category_name',
      header: 'Category',
      cell: ({ row }) => row.original.category_name ?? '—',
      enableSorting: true,
    },
    {
      accessorKey: 'yield_percentage',
      header: 'Yield %',
      cell: ({ row }) => `${row.original.yield_percentage}%`,
      enableSorting: true,
    },
    {
      accessorKey: 'par_level',
      header: 'Par Level',
      cell: ({ row }) =>
        row.original.par_level != null ? row.original.par_level : '—',
      enableSorting: true,
    },
    {
      accessorKey: 'min_level',
      header: 'Min Level',
      cell: ({ row }) =>
        row.original.min_level != null ? row.original.min_level : '—',
      enableSorting: true,
    },
    {
      accessorKey: 'max_level',
      header: 'Max Level',
      cell: ({ row }) =>
        row.original.max_level != null ? row.original.max_level : '—',
      enableSorting: true,
    },
    {
      accessorKey: 'cycle_count_frequency',
      header: 'Cycle Count',
      cell: ({ row }) => {
        const freq = row.original.cycle_count_frequency
        return freq ? (CYCLE_COUNT_LABELS[freq] ?? freq) : '—'
      },
      enableSorting: false,
    },
    {
      accessorKey: 'location_label',
      header: 'Location',
      cell: ({ row }) => row.original.location_label ?? '—',
      enableSorting: true,
    },
    {
      accessorKey: 'current_quantity',
      header: 'Stock',
      cell: ({ row }) => (
        <span className="font-mono">
          {formatNumber(row.original.current_quantity)}{' '}
          {row.original.storage_uom_abbreviation ?? ''}
        </span>
      ),
      enableSorting: true,
    },
    {
      accessorKey: 'stock_value',
      header: 'Value',
      cell: ({ row }) => formatMoney(row.original.stock_value),
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
      cell: ({ row }) => {
        const date = new Date(row.original.created_at)
        return date.toLocaleDateString('en-US', {
          month: 'short',
          day: 'numeric',
          year: 'numeric',
        })
      },
      enableSorting: true,
    },
  ]
}
