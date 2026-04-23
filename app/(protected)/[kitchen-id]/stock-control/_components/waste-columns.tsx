'use client'

import type { ReactNode } from 'react'
import type { ColumnDef } from '@tanstack/react-table'
import type { Row } from '@tanstack/react-table'
import { RotateCcwIcon } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { DropdownMenuItem } from '@/components/ui/dropdown-menu'
import { DataTableRowActions } from '@/components/data-table/data-table-row-actions'
import { getSelectColumn } from '@/components/data-table/data-table-select-column'
import type { ColumnConfig } from '@/lib/types/data-table'

interface MemberDisplay {
  id: string
  profiles: { full_name: string | null } | null
}

export interface WasteLedgerEntry {
  id: string
  kitchen_id: string
  source_type: 'manual_log' | 'comp' | 'variance' | 'waste_reversal'
  item_type: 'inventory_item' | 'production_recipe'
  inventory_item_id: string | null
  production_recipe_id: string | null
  quantity: string | number
  unit_cost: string | number
  total_cost: string | number
  reason: string | null
  source_id: string | null
  reversal_of_id: string | null
  reversed_by: string | null
  reversed_at: string | null
  reversal_reason: string | null
  created_by: string
  created_at: string
  inventory_items: { id: string; name: string } | null
  production_recipes: { id: string; name: string } | null
  created_member: MemberDisplay | null
  reversed_member: MemberDisplay | null
}

export const wasteColumnConfigs: ColumnConfig[] = [
  { column: 'source_type', label: 'Source', type: 'select', options: ['manual_log', 'comp', 'variance', 'waste_reversal'] },
  { column: 'item_type', label: 'Type', type: 'select', options: ['inventory_item', 'production_recipe'] },
  { column: 'quantity', label: 'Quantity', type: 'number', sortable: true },
  { column: 'total_cost', label: 'Total Cost', type: 'number', sortable: true },
  { column: 'reason', label: 'Reason', type: 'text', sortable: true },
  { column: 'created_at', label: 'Created', type: 'date', sortable: true },
]

function formatNumber(value: string | number) {
  const n = Number(value)
  if (Number.isNaN(n)) return '-'
  return n.toLocaleString(undefined, { maximumFractionDigits: 4 })
}

function formatMoney(value: string | number) {
  const n = Number(value)
  if (Number.isNaN(n)) return '-'
  return n.toLocaleString(undefined, { maximumFractionDigits: 3 })
}

function formatDate(value: string) {
  return new Date(value).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

function sourceLabel(source: WasteLedgerEntry['source_type']) {
  if (source === 'manual_log') return 'Manual'
  if (source === 'waste_reversal') return 'Reversal'
  return source
}

function statusBadge(row: WasteLedgerEntry) {
  if (row.reversal_of_id || row.source_type === 'waste_reversal') {
    return <Badge variant="outline">Reversal</Badge>
  }
  if (row.reversed_at) {
    return <Badge variant="destructive">Reversed</Badge>
  }
  return <Badge variant="secondary">Active</Badge>
}

export function getWasteColumns(callbacks?: {
  onReverse: (row: Row<WasteLedgerEntry>) => void
  canReverse: boolean
}): ColumnDef<WasteLedgerEntry>[] {
  const extraItems = (row: Row<WasteLedgerEntry>): ReactNode => {
    const canReverseRow =
      callbacks?.canReverse &&
      row.original.source_type === 'manual_log' &&
      !row.original.reversal_of_id &&
      !row.original.reversed_at

    if (!canReverseRow) return null

    return (
      <DropdownMenuItem
        variant="destructive"
        onClick={() => callbacks.onReverse(row)}
      >
        <RotateCcwIcon />
        Reverse
      </DropdownMenuItem>
    )
  }

  return [
    getSelectColumn<WasteLedgerEntry>({
      renderRowEnd: (row) => (
        <DataTableRowActions
          row={row}
          permissions={{ canEdit: false, canDelete: false }}
          onEdit={() => {}}
          onDelete={() => {}}
          extraItems={extraItems}
        />
      ),
    }),
    {
      id: 'item',
      header: 'Item',
      cell: ({ row }) => (
        <div className="flex min-w-48 flex-col">
          <span className="font-medium">
            {row.original.inventory_items?.name ??
              row.original.production_recipes?.name ??
              '-'}
          </span>
          <span className="text-xs text-muted-foreground">
            {row.original.item_type === 'inventory_item'
              ? 'Inventory'
              : 'Production'}
          </span>
        </div>
      ),
      enableSorting: false,
    },
    {
      accessorKey: 'source_type',
      header: 'Source',
      cell: ({ row }) => (
        <Badge variant="outline">{sourceLabel(row.original.source_type)}</Badge>
      ),
      enableSorting: false,
    },
    {
      id: 'status',
      header: 'Status',
      cell: ({ row }) => statusBadge(row.original),
      enableSorting: false,
    },
    {
      accessorKey: 'quantity',
      header: 'Qty',
      cell: ({ row }) => formatNumber(row.original.quantity),
      enableSorting: true,
    },
    {
      accessorKey: 'unit_cost',
      header: 'Unit Cost',
      cell: ({ row }) => formatMoney(row.original.unit_cost),
      enableSorting: true,
    },
    {
      accessorKey: 'total_cost',
      header: 'Total Cost',
      cell: ({ row }) => formatMoney(row.original.total_cost),
      enableSorting: true,
    },
    {
      accessorKey: 'reason',
      header: 'Reason',
      cell: ({ row }) => row.original.reason ?? '-',
      enableSorting: true,
    },
    {
      accessorKey: 'created_at',
      header: 'Created',
      cell: ({ row }) => (
        <div className="flex min-w-36 flex-col">
          <span>{formatDate(row.original.created_at)}</span>
          <span className="text-xs text-muted-foreground">
            {row.original.created_member?.profiles?.full_name ?? '-'}
          </span>
        </div>
      ),
      enableSorting: true,
    },
  ]
}
