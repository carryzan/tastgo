'use client'

import type { ReactNode } from 'react'
import type { ColumnDef, Row } from '@tanstack/react-table'
import { ReceiptTextIcon } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { DropdownMenuItem } from '@/components/ui/dropdown-menu'
import { getSelectColumn } from '@/components/data-table/data-table-select-column'
import { DataTableRowActions } from '@/components/data-table/data-table-row-actions'
import type { ColumnConfig, Permission } from '@/lib/types/data-table'
import type { ExpenseRecurrenceSchedule } from '../_lib/queries'

function formatAmount(value: string | number) {
  const amount = typeof value === 'string' ? Number(value) : value
  if (Number.isNaN(amount)) return '—'
  return amount.toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })
}

function uniqueOptions(values: Array<string | null | undefined>) {
  return [...new Set(values.map((value) => value?.trim()).filter(Boolean))] as string[]
}

export function getExpenseRecurringColumnConfigs(lookups: {
  categoryNames: string[]
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
      column: 'settlement_account.name',
      label: 'Settlement Account',
      type: 'select',
      options: uniqueOptions(lookups.settlementAccountNames),
    },
    {
      column: 'frequency',
      label: 'Frequency',
      type: 'select',
      options: ['weekly', 'monthly'],
    },
    { column: 'is_active', label: 'Active', type: 'boolean' },
    { column: 'next_due_date', label: 'Next Due', type: 'date', sortable: true },
    { column: 'amount', label: 'Amount', type: 'number', sortable: true },
  ]
}

export function getExpenseRecurringColumns(
  permissions: Permission,
  callbacks: {
    onEdit: (row: Row<ExpenseRecurrenceSchedule>) => void
    onDelete: (row: Row<ExpenseRecurrenceSchedule>) => void
    onRecordExpense: (row: Row<ExpenseRecurrenceSchedule>) => void
    canRecordExpense: boolean
  }
): ColumnDef<ExpenseRecurrenceSchedule>[] {
  const showRowActions = Boolean(
    permissions.canEdit || permissions.canDelete || callbacks.canRecordExpense
  )

  const extraItems = (row: Row<ExpenseRecurrenceSchedule>): ReactNode => {
    if (!callbacks.canRecordExpense || !row.original.is_active) return null

    return (
      <DropdownMenuItem onClick={() => callbacks.onRecordExpense(row)}>
        <ReceiptTextIcon />
        Record Expense
      </DropdownMenuItem>
    )
  }

  return [
    getSelectColumn<ExpenseRecurrenceSchedule>(
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
      cell: ({ row }) => <span className="font-medium">{row.original.name}</span>,
      enableSorting: true,
    },
    {
      id: 'category',
      header: 'Category',
      cell: ({ row }) => row.original.category?.name ?? '—',
      enableSorting: false,
    },
    {
      accessorKey: 'amount',
      header: 'Amount',
      cell: ({ row }) => formatAmount(row.original.amount),
      enableSorting: true,
    },
    {
      accessorKey: 'frequency',
      header: 'Frequency',
      cell: ({ row }) => (
        <Badge variant="outline">
          {row.original.frequency === 'weekly' ? 'Weekly' : 'Monthly'}
        </Badge>
      ),
      enableSorting: false,
    },
    {
      accessorKey: 'next_due_date',
      header: 'Next Due',
      cell: ({ row }) =>
        new Date(`${row.original.next_due_date}T00:00:00`).toLocaleDateString('en-US', {
          month: 'short',
          day: 'numeric',
          year: 'numeric',
        }),
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
      accessorKey: 'is_active',
      header: 'Status',
      cell: ({ row }) =>
        row.original.is_active ? (
          <Badge variant="secondary">Active</Badge>
        ) : (
          <Badge variant="outline">Inactive</Badge>
        ),
      enableSorting: false,
    },
  ]
}
