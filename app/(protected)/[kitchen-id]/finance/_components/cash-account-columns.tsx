'use client'

import type { ReactNode } from 'react'
import type { ColumnDef, Row } from '@tanstack/react-table'
import { ReceiptTextIcon, LockIcon } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { DropdownMenuItem } from '@/components/ui/dropdown-menu'
import { getSelectColumn } from '@/components/data-table/data-table-select-column'
import { DataTableRowActions } from '@/components/data-table/data-table-row-actions'
import type { ColumnConfig, Permission } from '@/lib/types/data-table'

export interface ChartAccount {
  id: string
  kitchen_id: string
  code: string
  name: string
  account_type:
    | 'asset'
    | 'liability'
    | 'equity'
    | 'revenue'
    | 'expense'
  | 'contra_revenue'
  | 'cost_of_goods_sold'
  parent_account_id: string | null
  normal_balance: 'debit' | 'credit'
  is_system: boolean
  is_active: boolean
  created_at: string
  updated_at: string
}

/** @deprecated Use ChartAccount */
export type CashAccount = ChartAccount

export const cashAccountColumnConfigs: ColumnConfig[] = [
  { column: 'code', label: 'Code', type: 'text', sortable: true },
  { column: 'name', label: 'Name', type: 'text', sortable: true },
  {
    column: 'account_type',
    label: 'Type',
    type: 'select',
    options: [
      'asset',
      'liability',
      'equity',
      'revenue',
      'expense',
      'contra_revenue',
      'cost_of_goods_sold',
    ],
  },
  { column: 'is_active', label: 'Active', type: 'boolean' },
]

const ACCOUNT_TYPE_LABELS: Record<string, string> = {
  asset: 'Asset',
  liability: 'Liability',
  equity: 'Equity',
  revenue: 'Revenue',
  expense: 'Expense',
  contra_revenue: 'Contra Revenue',
  cost_of_goods_sold: 'Cost of Goods Sold',
}

export function getCashAccountColumns(
  permissions: Permission,
  callbacks: {
    onEdit: (row: Row<ChartAccount>) => void
    onDelete: (row: Row<ChartAccount>) => void
    onViewTransactions: (row: Row<ChartAccount>) => void
  }
): ColumnDef<ChartAccount>[] {
  const showRowActions = Boolean(permissions.canEdit || permissions.canDelete)

  const extraItems = (row: Row<ChartAccount>): ReactNode => (
    <DropdownMenuItem onClick={() => callbacks.onViewTransactions(row)}>
      <ReceiptTextIcon />
      View Transactions
    </DropdownMenuItem>
  )

  return [
    getSelectColumn<ChartAccount>(
      showRowActions
        ? {
            renderRowEnd: (row) => {
              const isSystem = row.original.is_system
              const rowPermissions: Permission = {
                canEdit: permissions.canEdit,
                canDelete: isSystem ? false : permissions.canDelete,
              }
              return (
                <DataTableRowActions
                  row={row}
                  permissions={rowPermissions}
                  onEdit={callbacks.onEdit}
                  onDelete={callbacks.onDelete}
                  extraItems={extraItems}
                />
              )
            },
          }
        : undefined
    ),
    {
      accessorKey: 'code',
      header: 'Code',
      cell: ({ row }) => (
        <span className="font-mono text-sm">{row.original.code}</span>
      ),
      enableSorting: true,
    },
    {
      accessorKey: 'name',
      header: 'Name',
      cell: ({ row }) => (
        <div className="flex items-center gap-2">
          <span className="font-medium">{row.original.name}</span>
          {row.original.is_system && (
            <LockIcon className="size-3 text-muted-foreground" />
          )}
        </div>
      ),
      enableSorting: true,
    },
    {
      accessorKey: 'account_type',
      header: 'Type',
      cell: ({ row }) => (
        <Badge variant="secondary">
          {ACCOUNT_TYPE_LABELS[row.original.account_type] ??
            row.original.account_type}
        </Badge>
      ),
      enableSorting: false,
    },
    {
      accessorKey: 'normal_balance',
      header: 'Normal Balance',
      cell: ({ row }) => (
        <span className="capitalize">{row.original.normal_balance}</span>
      ),
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
