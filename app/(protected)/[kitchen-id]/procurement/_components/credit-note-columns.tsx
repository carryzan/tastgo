'use client'

import type { ReactNode } from 'react'
import type { ColumnDef, Row } from '@tanstack/react-table'
import { Eye } from 'lucide-react'
import { DropdownMenuItem } from '@/components/ui/dropdown-menu'
import { Badge } from '@/components/ui/badge'
import { getSelectColumn } from '@/components/data-table/data-table-select-column'
import { DataTableRowActions } from '@/components/data-table/data-table-row-actions'
import type { ColumnConfig } from '@/lib/types/data-table'

export type CreditNoteStatus = 'open' | 'partially_settled' | 'settled' | 'reversed'
export type CreditNoteOriginType = 'supplier_return' | 'manual'

export interface SupplierCreditAllocationEmbed {
  id: string
  purchase_id: string
  amount: string | number
  voided_at: string | null
  purchases: { id: string; purchase_number: number } | null
}

export interface SupplierCreditRefundEmbed {
  id: string
  amount: string | number
  reversed_at: string | null
}

export interface SupplierCreditNote {
  id: string
  kitchen_id: string
  supplier_return_id: string | null
  supplier_id: string
  credit_value: string | number
  status: CreditNoteStatus
  origin_type: CreditNoteOriginType
  note: string | null
  offset_account_id: string | null
  journal_entry_id: string | null
  created_by: string
  reversed_by: string | null
  reversed_at: string | null
  reversal_reason: string | null
  created_at: string
  updated_at: string
  suppliers: { id: string; name: string } | null
  supplier_returns: { id: string; total_credit_value: string | number } | null
  offset_account: { id: string; code: string; name: string } | null
  allocations: SupplierCreditAllocationEmbed[] | null
  refunds: SupplierCreditRefundEmbed[] | null
}

export const creditNoteColumnConfigs: ColumnConfig[] = [
  { column: 'origin_type', label: 'Source', type: 'select', options: ['supplier_return', 'manual'] },
  { column: 'status', label: 'Status', type: 'select', options: ['open', 'partially_settled', 'settled', 'reversed'] },
  { column: 'credit_value', label: 'Credit value', type: 'number', sortable: true },
  { column: 'created_at', label: 'Created', type: 'date', sortable: true },
]

const STATUS_VARIANTS: Record<CreditNoteStatus, 'default' | 'secondary' | 'outline' | 'destructive'> = {
  open: 'outline',
  partially_settled: 'secondary',
  settled: 'default',
  reversed: 'destructive',
}

const STATUS_LABELS: Record<CreditNoteStatus, string> = {
  open: 'Open',
  partially_settled: 'Partial',
  settled: 'Settled',
  reversed: 'Reversed',
}

const ORIGIN_LABELS: Record<CreditNoteOriginType, string> = {
  supplier_return: 'Return',
  manual: 'Manual',
}

function formatAmount(value: string | number) {
  const n = typeof value === 'string' ? Number(value) : value
  if (Number.isNaN(n)) return '—'
  return n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

export function getCreditNoteColumns(callbacks: {
  onViewDetail: (row: Row<SupplierCreditNote>) => void
}): ColumnDef<SupplierCreditNote>[] {
  const extraItems = (row: Row<SupplierCreditNote>): ReactNode => (
    <DropdownMenuItem onClick={() => callbacks.onViewDetail(row)}>
      <Eye />
      View detail
    </DropdownMenuItem>
  )

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
      accessorKey: 'origin_type',
      header: 'Source',
      cell: ({ row }) => ORIGIN_LABELS[row.original.origin_type] ?? '—',
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
      cell: ({ row }) => {
        const s = row.original.status
        return (
          <Badge variant={STATUS_VARIANTS[s] ?? 'outline'}>
            {STATUS_LABELS[s] ?? s}
          </Badge>
        )
      },
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
