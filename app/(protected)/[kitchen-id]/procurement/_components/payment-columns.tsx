'use client'

import type { ColumnDef } from '@tanstack/react-table'
import { getSelectColumn } from '@/components/data-table/data-table-select-column'
import type { ColumnConfig } from '@/lib/types/data-table'

export interface SupplierPayment {
  id: string
  kitchen_id: string
  reference_purchase_id: string | null
  supplier_id: string
  amount: string | number
  settlement_account_id: string | null
  journal_entry_id: string | null
  paid_by: string
  created_at: string
  suppliers: { id: string; name: string } | null
  purchases: { id: string; purchase_number: number } | null
  settlement_account: { id: string; code: string; name: string } | null
  paid_member: { id: string; profiles: { full_name: string } | null } | null
}

export const paymentColumnConfigs: ColumnConfig[] = [
  { column: 'amount', label: 'Amount', type: 'number', sortable: true },
  { column: 'created_at', label: 'Date', type: 'date', sortable: true },
]

function formatAmount(value: string | number) {
  const n = typeof value === 'string' ? Number(value) : value
  if (Number.isNaN(n)) return '—'
  return n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

export function getPaymentColumns(): ColumnDef<SupplierPayment>[] {
  return [
    getSelectColumn<SupplierPayment>(),
    {
      id: 'supplier',
      header: 'Supplier',
      cell: ({ row }) => row.original.suppliers?.name ?? '—',
      enableSorting: false,
    },
    {
      id: 'purchase',
      header: 'Purchase',
      cell: ({ row }) =>
        row.original.purchases
          ? `#${row.original.purchases.purchase_number}`
          : '—',
      enableSorting: false,
    },
    {
      accessorKey: 'amount',
      header: 'Amount',
      cell: ({ row }) => (
        <span className="font-medium">{formatAmount(row.original.amount)}</span>
      ),
      enableSorting: true,
    },
    {
      id: 'settlement_account',
      header: 'Account',
      cell: ({ row }) => {
        const acct = row.original.settlement_account
        if (!acct) return '—'
        return `${acct.code} · ${acct.name}`
      },
      enableSorting: false,
    },
    {
      id: 'paid_by',
      header: 'Paid by',
      cell: ({ row }) =>
        row.original.paid_member?.profiles?.full_name ?? '—',
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
