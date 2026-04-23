'use client'

import type { ReactNode } from 'react'
import type { ColumnDef, Row } from '@tanstack/react-table'
import { RotateCcwIcon } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { DropdownMenuItem } from '@/components/ui/dropdown-menu'
import { getSelectColumn } from '@/components/data-table/data-table-select-column'
import { DataTableRowActions } from '@/components/data-table/data-table-row-actions'
import type { ColumnConfig } from '@/lib/types/data-table'
import type { ExpenseRecord } from '../_lib/queries'

function formatAmount(value: string | number) {
  const amount = typeof value === 'string' ? Number(value) : value
  if (Number.isNaN(amount)) return '—'
  return amount.toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })
}

function formatDate(value: string) {
  return new Date(`${value}T00:00:00`).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

function uniqueOptions(values: Array<string | null | undefined>) {
  return [...new Set(values.map((value) => value?.trim()).filter(Boolean))] as string[]
}

export function getExpenseRecordColumnConfigs(lookups: {
  categoryNames: string[]
  staffNames: string[]
  settlementAccountNames: string[]
}): ColumnConfig[] {
  return [
    { column: 'name', label: 'Name', type: 'text', sortable: true },
    {
      column: 'category.name',
      label: 'Category',
      type: 'select',
      options: uniqueOptions(lookups.categoryNames),
    },
    {
      column: 'billing_period_type',
      label: 'Billing',
      type: 'select',
      options: ['one_time', 'recurring'],
    },
    {
      column: 'staff_member.full_name',
      label: 'Staff Member',
      type: 'select',
      options: uniqueOptions(lookups.staffNames),
    },
    {
      column: 'settlement_account.name',
      label: 'Settlement Account',
      type: 'select',
      options: uniqueOptions(lookups.settlementAccountNames),
    },
    {
      column: 'expense_date',
      label: 'Expense Date',
      type: 'date',
      sortable: true,
    },
    { column: 'amount', label: 'Amount', type: 'number', sortable: true },
  ]
}

export function getExpenseRecordColumns(callbacks: {
  onReverse: (row: Row<ExpenseRecord>) => void
  canReverse: boolean
}): ColumnDef<ExpenseRecord>[] {
  const extraItems = (row: Row<ExpenseRecord>): ReactNode => {
    const isReversed = Boolean(row.original.reversed_at || row.original.reversal_of_id)
    if (!callbacks.canReverse || isReversed) return null

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
    getSelectColumn<ExpenseRecord>({
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
      accessorKey: 'expense_date',
      header: 'Date',
      cell: ({ row }) => formatDate(row.original.expense_date),
      enableSorting: true,
    },
    {
      accessorKey: 'name',
      header: 'Name',
      cell: ({ row }) => (
        <div className="flex flex-col">
          <span className="font-medium">{row.original.name}</span>
          <span className="text-xs text-muted-foreground">
            Created by {row.original.created_member?.profiles?.full_name ?? '—'}
          </span>
        </div>
      ),
      enableSorting: true,
    },
    {
      id: 'category',
      header: 'Category',
      cell: ({ row }) => row.original.category?.name ?? '—',
      enableSorting: false,
    },
    {
      accessorKey: 'billing_period_type',
      header: 'Billing',
      cell: ({ row }) => (
        <Badge variant="outline">
          {row.original.billing_period_type === 'one_time' ? 'One Time' : 'Recurring'}
        </Badge>
      ),
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
      header: 'Settlement',
      cell: ({ row }) => {
        const account = row.original.settlement_account
        return account ? `${account.code} · ${account.name}` : '—'
      },
      enableSorting: false,
    },
    {
      id: 'staff_member',
      header: 'Staff',
      cell: ({ row }) => row.original.staff_member?.full_name ?? '—',
      enableSorting: false,
    },
    {
      id: 'status',
      header: 'Status',
      cell: ({ row }) =>
        row.original.reversed_at ? (
          <Badge variant="destructive">Reversed</Badge>
        ) : (
          <Badge variant="secondary">Active</Badge>
        ),
      enableSorting: false,
    },
    {
      id: 'journal',
      header: 'Journal',
      cell: ({ row }) =>
        row.original.journal_entry
          ? `#${row.original.journal_entry.journal_number}`
          : '—',
      enableSorting: false,
    },
  ]
}
