'use client'

import type { ColumnDef, Row } from '@tanstack/react-table'
import { Badge } from '@/components/ui/badge'
import { getSelectColumn } from '@/components/data-table/data-table-select-column'
import { DataTableRowActions } from '@/components/data-table/data-table-row-actions'
import type { ColumnConfig, Permission } from '@/lib/types/data-table'
import type { StaffMember } from '../_lib/queries'

function formatAmount(value: string | number) {
  const amount = typeof value === 'string' ? Number(value) : value
  if (Number.isNaN(amount)) return '—'
  return amount.toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })
}

export const staffMemberColumnConfigs: ColumnConfig[] = [
  { column: 'full_name', label: 'Name', type: 'text', sortable: true },
  { column: 'role', label: 'Role', type: 'text', sortable: true },
  {
    column: 'pay_frequency',
    label: 'Pay Frequency',
    type: 'select',
    options: ['daily', 'weekly', 'monthly'],
  },
  {
    column: 'pay_calculation_type',
    label: 'Pay Type',
    type: 'select',
    options: ['fixed', 'hourly'],
  },
  { column: 'is_active', label: 'Active', type: 'boolean' },
]

export function getStaffMemberColumns(
  permissions: Permission,
  callbacks: {
    onEdit: (row: Row<StaffMember>) => void
    onDelete: (row: Row<StaffMember>) => void
  }
): ColumnDef<StaffMember>[] {
  const showRowActions = Boolean(permissions.canEdit || permissions.canDelete)

  return [
    getSelectColumn<StaffMember>(
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
      accessorKey: 'full_name',
      header: 'Name',
      cell: ({ row }) => (
        <div className="flex flex-col">
          <span className="font-medium">{row.original.full_name}</span>
          <span className="text-xs text-muted-foreground">
            {row.original.phone ?? '—'}
          </span>
        </div>
      ),
      enableSorting: true,
    },
    {
      accessorKey: 'role',
      header: 'Role',
      cell: ({ row }) => row.original.role ?? '—',
      enableSorting: true,
    },
    {
      accessorKey: 'pay_rate',
      header: 'Pay Rate',
      cell: ({ row }) => formatAmount(row.original.pay_rate),
      enableSorting: true,
    },
    {
      accessorKey: 'pay_frequency',
      header: 'Frequency',
      cell: ({ row }) => (
        <Badge variant="outline" className="capitalize">
          {row.original.pay_frequency}
        </Badge>
      ),
      enableSorting: false,
    },
    {
      accessorKey: 'pay_calculation_type',
      header: 'Pay Type',
      cell: ({ row }) => (
        <Badge variant="outline" className="capitalize">
          {row.original.pay_calculation_type}
        </Badge>
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
