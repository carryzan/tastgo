'use client'

import type { ReactNode } from 'react'
import type { ColumnDef, Row } from '@tanstack/react-table'
import { ReceiptTextIcon } from 'lucide-react'
import { DropdownMenuItem } from '@/components/ui/dropdown-menu'
import { getSelectColumn } from '@/components/data-table/data-table-select-column'
import { DataTableRowActions } from '@/components/data-table/data-table-row-actions'
import type { ColumnConfig, Permission } from '@/lib/types/data-table'

export interface CashAccount {
  id: string
  kitchen_id: string
  name: string
  current_balance: string | number
  is_active: boolean
  created_at: string
  updated_at: string
}

export const cashAccountColumnConfigs: ColumnConfig[] = [
  { column: 'name', label: 'Name', type: 'text', sortable: true },
  { column: 'current_balance', label: 'Balance', type: 'number', sortable: true },
  { column: 'is_active', label: 'Active', type: 'boolean' },
  { column: 'created_at', label: 'Created', type: 'date', sortable: true },
]

function formatBalance(value: string | number) {
  const n = typeof value === 'string' ? Number(value) : value
  if (Number.isNaN(n)) return '—'
  return n.toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 3,
  })
}

export function getCashAccountColumns(
  permissions: Permission,
  callbacks: {
    onEdit: (row: Row<CashAccount>) => void
    onDelete: (row: Row<CashAccount>) => void
    onViewTransactions: (row: Row<CashAccount>) => void
  }
): ColumnDef<CashAccount>[] {
  const showRowActions = Boolean(permissions.canEdit || permissions.canDelete)

  const extraItems = (row: Row<CashAccount>): ReactNode => (
    <DropdownMenuItem onClick={() => callbacks.onViewTransactions(row)}>
      <ReceiptTextIcon />
      View Transactions
    </DropdownMenuItem>
  )

  return [
    getSelectColumn<CashAccount>(
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
      cell: ({ row }) => (
        <span className="font-medium">{row.original.name}</span>
      ),
      enableSorting: true,
    },
    {
      accessorKey: 'current_balance',
      header: 'Balance',
      cell: ({ row }) => formatBalance(row.original.current_balance),
      enableSorting: true,
    },
    {
      accessorKey: 'is_active',
      header: 'Status',
      cell: ({ row }) => (row.original.is_active ? 'Active' : 'Inactive'),
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
