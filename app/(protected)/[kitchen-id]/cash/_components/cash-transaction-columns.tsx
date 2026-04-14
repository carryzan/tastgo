'use client'

import type { ColumnDef } from '@tanstack/react-table'
import { getSelectColumn } from '@/components/data-table/data-table-select-column'
import type { ColumnConfig } from '@/lib/types/data-table'

export interface CashTransaction {
  id: string
  kitchen_id: string
  cash_account_id: string
  type: 'deposit' | 'withdrawal' | 'transfer'
  amount: string | number
  reason: string | null
  source_type: string | null
  source_id: string | null
  transfer_to_account_id: string | null
  created_by: string
  created_at: string
  cash_accounts: { id: string; name: string } | null
  created_member: { id: string; profiles: { full_name: string } | null } | null
  transfer_account: { id: string; name: string } | null
}

export const cashTransactionColumnConfigs: ColumnConfig[] = [
  {
    column: 'type',
    label: 'Type',
    type: 'select',
    options: ['deposit', 'withdrawal', 'transfer'],
  },
  { column: 'amount', label: 'Amount', type: 'number', sortable: true },
  { column: 'created_at', label: 'Date', type: 'date', sortable: true },
]

const SOURCE_TYPE_LABELS: Record<string, string> = {
  drawer_deposit: 'Drawer Deposit',
  marketplace_payout: 'Marketplace Payout',
  expense: 'Expense',
  supplier_payment: 'Supplier Payment',
  supplier_refund: 'Supplier Refund',
  refund: 'Refund',
  manual: 'Manual',
}

function formatAmount(value: string | number) {
  const n = typeof value === 'string' ? Number(value) : value
  if (Number.isNaN(n)) return '—'
  return n.toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 3,
  })
}

export function getCashTransactionColumns(): ColumnDef<CashTransaction>[] {
  return [
    getSelectColumn<CashTransaction>(),
    {
      id: 'account',
      header: 'Account',
      cell: ({ row }) => row.original.cash_accounts?.name ?? '—',
      enableSorting: false,
    },
    {
      accessorKey: 'type',
      header: 'Type',
      cell: ({ row }) => (
        <span className="capitalize">{row.original.type}</span>
      ),
      enableSorting: false,
    },
    {
      accessorKey: 'amount',
      header: 'Amount',
      cell: ({ row }) => {
        const isCredit = row.original.type === 'deposit'
        return (
          <span
            className={
              isCredit
                ? 'font-medium text-green-600 dark:text-green-400'
                : 'font-medium text-destructive'
            }
          >
            {isCredit ? '+' : '-'}
            {formatAmount(row.original.amount)}
          </span>
        )
      },
      enableSorting: true,
    },
    {
      id: 'source',
      header: 'Source',
      cell: ({ row }) => {
        const { source_type } = row.original
        if (!source_type) return '—'
        return SOURCE_TYPE_LABELS[source_type] ?? source_type
      },
      enableSorting: false,
    },
    {
      id: 'transfer_to',
      header: 'Transfer To',
      cell: ({ row }) => row.original.transfer_account?.name ?? '—',
      enableSorting: false,
    },
    {
      accessorKey: 'reason',
      header: 'Reason',
      cell: ({ row }) => row.original.reason ?? '—',
      enableSorting: false,
    },
    {
      id: 'created_by',
      header: 'Created By',
      cell: ({ row }) => row.original.created_member?.profiles?.full_name ?? '—',
      enableSorting: false,
    },
    {
      accessorKey: 'created_at',
      header: 'Date',
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
