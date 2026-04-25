'use client'

import type { ReactNode } from 'react'
import type { ColumnDef, Row } from '@tanstack/react-table'
import { FileTextIcon, RotateCcwIcon } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { DropdownMenuItem } from '@/components/ui/dropdown-menu'
import { getSelectColumn } from '@/components/data-table/data-table-select-column'
import { DataTableRowActions } from '@/components/data-table/data-table-row-actions'
import type { ColumnConfig } from '@/lib/types/data-table'

export interface JournalEntry {
  id: string
  kitchen_id: string
  journal_number: number
  entry_date: string
  entry_type: string
  memo: string | null
  status: 'draft' | 'posted' | 'reversed'
  reversal_of_id: string | null
  total_debit: string | number
  total_credit: string | number
  posted_by: string | null
  posted_at: string | null
  created_at: string
  period: { id: string; name: string; status: string } | null
  posted_member: {
    id: string
    profiles: { full_name: string } | null
  } | null
}

export const journalEntryColumnConfigs: ColumnConfig[] = [
  {
    column: 'status',
    label: 'Status',
    type: 'select',
    options: ['draft', 'posted', 'reversed'],
  },
  {
    column: 'entry_type',
    label: 'Type',
    type: 'select',
    options: [
      'manual_journal',
      'manual_journal_reversal',
      'order_revenue',
      'order_revenue_reversal',
      'order_cogs',
      'order_cogs_reversal',
      'purchase_received',
      'purchase_received_reversal',
      'supplier_payment',
      'supplier_payment_reversal',
      'supplier_credit_note',
      'supplier_credit_note_reversal',
      'expense',
      'expense_reversal',
      'online_settlement',
      'online_settlement_reversal',
      'order_full_comp',
      'order_full_comp_reversal',
      'order_partial_comp',
      'order_partial_comp_reversal',
      'order_refund',
      'order_refund_reversal',
      'waste',
      'waste_reversal',
    ],
  },
  { column: 'entry_date', label: 'Date', type: 'date', sortable: true },
  { column: 'total_debit', label: 'Total', type: 'number', sortable: true },
]

export const ENTRY_TYPE_LABELS: Record<string, string> = {
  manual_journal: 'Manual',
  manual_journal_reversal: 'Manual Reversal',
  order_revenue: 'Order Revenue',
  order_revenue_reversal: 'Order Revenue Reversal',
  order_cogs: 'Order COGS',
  order_cogs_reversal: 'Order COGS Reversal',
  purchase_received: 'Purchase Received',
  purchase_received_reversal: 'Purchase Received Reversal',
  supplier_payment: 'Supplier Payment',
  supplier_payment_reversal: 'Supplier Payment Reversal',
  supplier_credit_note: 'Supplier Credit Note',
  supplier_credit_note_reversal: 'Supplier Credit Note Reversal',
  expense: 'Expense',
  expense_reversal: 'Expense Reversal',
  online_settlement: 'Online Settlement',
  online_settlement_reversal: 'Online Settlement Reversal',
  order_full_comp: 'Order Full Comp',
  order_full_comp_reversal: 'Order Full Comp Reversal',
  order_partial_comp: 'Order Partial Comp',
  order_partial_comp_reversal: 'Order Partial Comp Reversal',
  order_refund: 'Order Refund',
  order_refund_reversal: 'Order Refund Reversal',
  waste: 'Waste',
  waste_reversal: 'Waste Reversal',
}

function formatAmount(value: string | number) {
  const n = typeof value === 'string' ? Number(value) : value
  if (Number.isNaN(n)) return '—'
  return n.toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 3,
  })
}

function StatusBadge({ status }: { status: JournalEntry['status'] }) {
  if (status === 'posted') return <Badge variant="secondary">Posted</Badge>
  if (status === 'reversed') return <Badge variant="outline">Reversed</Badge>
  return <Badge variant="outline">Draft</Badge>
}

export function getJournalEntryColumns(callbacks: {
  onViewDetails: (row: Row<JournalEntry>) => void
  onReverse: (row: Row<JournalEntry>) => void
  canReverse: boolean
}): ColumnDef<JournalEntry>[] {
  const extraItems = (row: Row<JournalEntry>): ReactNode => {
    const canReverse =
      callbacks.canReverse &&
      row.original.status === 'posted' &&
      row.original.entry_type === 'manual_journal' &&
      !row.original.reversal_of_id

    return (
      <>
        <DropdownMenuItem onClick={() => callbacks.onViewDetails(row)}>
          <FileTextIcon />
          View Lines
        </DropdownMenuItem>
        {canReverse && (
          <DropdownMenuItem
            onClick={() => callbacks.onReverse(row)}
            className="text-destructive focus:text-destructive"
          >
            <RotateCcwIcon />
            Reverse
          </DropdownMenuItem>
        )}
      </>
    )
  }

  return [
    getSelectColumn<JournalEntry>({
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
      accessorKey: 'journal_number',
      header: 'Journal #',
      cell: ({ row }) => (
        <span className="font-mono text-sm">
          #{row.original.journal_number}
        </span>
      ),
      enableSorting: true,
    },
    {
      accessorKey: 'entry_date',
      header: 'Date',
      cell: ({ row }) =>
        new Date(row.original.entry_date).toLocaleDateString('en-US', {
          month: 'short',
          day: 'numeric',
          year: 'numeric',
        }),
      enableSorting: true,
    },
    {
      accessorKey: 'status',
      header: 'Status',
      cell: ({ row }) => <StatusBadge status={row.original.status} />,
      enableSorting: false,
    },
    {
      accessorKey: 'entry_type',
      header: 'Type',
      cell: ({ row }) => (
        <Badge variant="outline">
          {ENTRY_TYPE_LABELS[row.original.entry_type] ??
            row.original.entry_type}
        </Badge>
      ),
      enableSorting: false,
    },
    {
      id: 'period',
      header: 'Period',
      cell: ({ row }) => row.original.period?.name ?? '—',
      enableSorting: false,
    },
    {
      accessorKey: 'total_debit',
      header: 'Total',
      cell: ({ row }) => formatAmount(row.original.total_debit),
      enableSorting: true,
    },
    {
      accessorKey: 'memo',
      header: 'Memo',
      cell: ({ row }) => row.original.memo ?? '—',
      enableSorting: false,
    },
    {
      id: 'posted_by',
      header: 'Posted By',
      cell: ({ row }) =>
        row.original.posted_member?.profiles?.full_name ?? '—',
      enableSorting: false,
    },
  ]
}
