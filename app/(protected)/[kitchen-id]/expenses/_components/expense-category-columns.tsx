'use client'

import type { ColumnDef, Row } from '@tanstack/react-table'
import { Badge } from '@/components/ui/badge'
import { getSelectColumn } from '@/components/data-table/data-table-select-column'
import { DataTableRowActions } from '@/components/data-table/data-table-row-actions'
import type { ColumnConfig, Permission } from '@/lib/types/data-table'
import type { ExpenseCategory } from '../_lib/queries'

export const expenseCategoryColumnConfigs: ColumnConfig[] = [
  { column: 'name', label: 'Name', type: 'text', sortable: true },
  { column: 'expense_account.name', label: 'Account', type: 'text' },
  { column: 'is_active', label: 'Active', type: 'boolean' },
  { column: 'updated_at', label: 'Updated', type: 'date', sortable: true },
]

export function getExpenseCategoryColumns(
  permissions: Permission,
  callbacks: {
    onEdit: (row: Row<ExpenseCategory>) => void
    onDelete: (row: Row<ExpenseCategory>) => void
  }
): ColumnDef<ExpenseCategory>[] {
  const showRowActions = Boolean(permissions.canEdit || permissions.canDelete)

  return [
    getSelectColumn<ExpenseCategory>(
      showRowActions
        ? {
            renderRowEnd: (row) => (
              <DataTableRowActions
                row={row}
                permissions={permissions}
                onEdit={callbacks.onEdit}
                onDelete={callbacks.onDelete}
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
      id: 'expense_account',
      header: 'Expense Account',
      cell: ({ row }) => {
        const account = row.original.expense_account
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
    {
      accessorKey: 'updated_at',
      header: 'Updated',
      cell: ({ row }) =>
        new Date(row.original.updated_at).toLocaleDateString('en-US', {
          month: 'short',
          day: 'numeric',
          year: 'numeric',
        }),
      enableSorting: true,
    },
  ]
}
