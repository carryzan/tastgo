'use client'

import type { ReactNode } from 'react'
import type { ColumnDef, Row } from '@tanstack/react-table'
import { CheckIcon } from 'lucide-react'
import { DropdownMenuItem } from '@/components/ui/dropdown-menu'
import { Badge } from '@/components/ui/badge'
import { getSelectColumn } from '@/components/data-table/data-table-select-column'
import { DataTableRowActions } from '@/components/data-table/data-table-row-actions'
import type { ColumnConfig } from '@/lib/types/data-table'

export interface SupplierCreditNote {
  id: string
  kitchen_id: string
  supplier_return_id: string
  supplier_id: string
  credit_value: string | number
  status: 'pending' | 'applied'
  applied_to_purchase_id: string | null
  created_at: string
  updated_at: string
  suppliers: { id: string; name: string } | null
  supplier_returns: { id: string } | null
  applied_purchase: { id: string; purchase_number: number } | null
}

export const creditNoteColumnConfigs: ColumnConfig[] = [
  { column: 'status', label: 'Status', type: 'select', options: ['pending', 'applied'] },
  { column: 'credit_value', label: 'Credit value', type: 'number', sortable: true },
  { column: 'created_at', label: 'Created', type: 'date', sortable: true },
]

function formatAmount(value: string | number) {
  const n = typeof value === 'string' ? Number(value) : value
  if (Number.isNaN(n)) return '—'
  return n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

export function getCreditNoteColumns(callbacks: {
  onApply: (row: Row<SupplierCreditNote>) => void
}): ColumnDef<SupplierCreditNote>[] {
  const extraItems = (row: Row<SupplierCreditNote>): ReactNode => {
    if (row.original.status !== 'pending') return null
    return (
      <DropdownMenuItem onClick={() => callbacks.onApply(row)}>
        <CheckIcon />
        Apply to purchase
      </DropdownMenuItem>
    )
  }

  return [
    getSelectColumn<SupplierCreditNote>({
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
      id: 'supplier',
      header: 'Supplier',
      cell: ({ row }) => row.original.suppliers?.name ?? '—',
      enableSorting: false,
    },
    {
      accessorKey: 'credit_value',
      header: 'Credit value',
      cell: ({ row }) => (
        <span className="font-medium">{formatAmount(row.original.credit_value)}</span>
      ),
      enableSorting: true,
    },
    {
      accessorKey: 'status',
      header: 'Status',
      cell: ({ row }) => (
        <Badge variant={row.original.status === 'applied' ? 'default' : 'outline'}>
          {row.original.status.charAt(0).toUpperCase() + row.original.status.slice(1)}
        </Badge>
      ),
      enableSorting: false,
    },
    {
      id: 'applied_to',
      header: 'Applied to',
      cell: ({ row }) =>
        row.original.applied_purchase
          ? `#${row.original.applied_purchase.purchase_number}`
          : '—',
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
