'use client'

import type { ReactNode } from 'react'
import type { ColumnDef, Row } from '@tanstack/react-table'
import { Eye } from 'lucide-react'
import { DropdownMenuItem } from '@/components/ui/dropdown-menu'
import { Badge } from '@/components/ui/badge'
import { getSelectColumn } from '@/components/data-table/data-table-select-column'
import { DataTableRowActions } from '@/components/data-table/data-table-row-actions'
import type { ColumnConfig } from '@/lib/types/data-table'

export interface SupplierPaymentAllocationEmbed {
  id: string
  purchase_id: string
  amount: string | number
  voided_at: string | null
  purchases: { id: string; purchase_number: number } | null
}

export interface SupplierPayment {
  id: string
  kitchen_id: string
  supplier_id: string
  amount: string | number
  settlement_account_id: string | null
  journal_entry_id: string | null
  paid_by: string
  reversed_by: string | null
  reversed_at: string | null
  reversal_reason: string | null
  created_at: string
  suppliers: { id: string; name: string } | null
  settlement_account: { id: string; code: string; name: string } | null
  paid_member: { id: string; profiles: { full_name: string } | null } | null
  allocations: SupplierPaymentAllocationEmbed[] | null
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

function getAllocationSummary(payment: SupplierPayment) {
  const paymentAmount = typeof payment.amount === 'string' ? Number(payment.amount) : payment.amount
  const activeAllocations = (payment.allocations ?? []).filter((allocation) => !allocation.voided_at)
  const allocatedAmount = activeAllocations.reduce((sum, allocation) => {
    const amount =
      typeof allocation.amount === 'string' ? Number(allocation.amount) : allocation.amount
    return sum + amount
  }, 0)
  const unallocatedAmount = Math.max(paymentAmount - allocatedAmount, 0)

  if (activeAllocations.length === 0) {
    return { label: 'Unallocated', variant: 'outline' as const, unallocatedAmount }
  }

  if (unallocatedAmount <= 0.001) {
    return { label: 'Fully allocated', variant: 'default' as const, unallocatedAmount: 0 }
  }

  return {
    label: 'Partially allocated',
    variant: 'secondary' as const,
    unallocatedAmount,
  }
}

export function getPaymentColumns(callbacks?: {
  onViewDetail: (row: Row<SupplierPayment>) => void
}): ColumnDef<SupplierPayment>[] {
  const extraItems = callbacks
    ? (row: Row<SupplierPayment>): ReactNode => (
        <DropdownMenuItem onClick={() => callbacks.onViewDetail(row)}>
          <Eye />
          View detail
        </DropdownMenuItem>
      )
    : undefined

  return [
    getSelectColumn<SupplierPayment>(
      extraItems
        ? {
            renderRowEnd: (row) => (
              <DataTableRowActions
                row={row}
                permissions={{ canEdit: false, canDelete: false }}
                onEdit={() => {}}
                onDelete={() => {}}
                extraItems={extraItems}
              />
            ),
          }
        : undefined
    ),
    {
      id: 'supplier',
      header: 'Supplier',
      cell: ({ row }) => row.original.suppliers?.name ?? '—',
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
      id: 'allocation_status',
      header: 'Allocation',
      cell: ({ row }) => {
        const summary = getAllocationSummary(row.original)
        return (
          <div className="flex flex-col gap-1">
            <Badge variant={summary.variant}>{summary.label}</Badge>
            {summary.unallocatedAmount > 0.001 && (
              <span className="text-xs text-muted-foreground">
                {formatAmount(summary.unallocatedAmount)} remaining
              </span>
            )}
          </div>
        )
      },
      enableSorting: false,
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
      id: 'status',
      header: 'Status',
      cell: ({ row }) => (
        <Badge variant={row.original.reversed_at ? 'destructive' : 'outline'}>
          {row.original.reversed_at ? 'Reversed' : 'Active'}
        </Badge>
      ),
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
