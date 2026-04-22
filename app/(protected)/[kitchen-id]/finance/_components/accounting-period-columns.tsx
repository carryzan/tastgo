'use client'

import type { ReactNode } from 'react'
import type { ColumnDef, Row } from '@tanstack/react-table'
import { LockIcon, UnlockIcon } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { DropdownMenuItem } from '@/components/ui/dropdown-menu'
import { getSelectColumn } from '@/components/data-table/data-table-select-column'
import { DataTableRowActions } from '@/components/data-table/data-table-row-actions'
import type { ColumnConfig } from '@/lib/types/data-table'

export interface AccountingPeriod {
  id: string
  kitchen_id: string
  name: string
  start_date: string
  end_date: string
  status: 'open' | 'closed'
  closed_at: string | null
  closed_by: string | null
  reopened_at: string | null
  reopened_by: string | null
  reopen_reason: string | null
  created_at: string
}

export const accountingPeriodColumnConfigs: ColumnConfig[] = [
  {
    column: 'status',
    label: 'Status',
    type: 'select',
    options: ['open', 'closed'],
  },
  { column: 'start_date', label: 'Start', type: 'date', sortable: true },
  { column: 'end_date', label: 'End', type: 'date', sortable: true },
]

function StatusBadge({ status }: { status: AccountingPeriod['status'] }) {
  return status === 'open' ? (
    <Badge variant="secondary">Open</Badge>
  ) : (
    <Badge variant="outline">Closed</Badge>
  )
}

export function getAccountingPeriodColumns(callbacks: {
  onClose: (row: Row<AccountingPeriod>) => void
  onReopen: (row: Row<AccountingPeriod>) => void
  canManage: boolean
}): ColumnDef<AccountingPeriod>[] {
  const extraItems = (row: Row<AccountingPeriod>): ReactNode => {
    if (!callbacks.canManage) return null

    const isOpen = row.original.status === 'open'
    return (
      isOpen ? (
        <DropdownMenuItem onClick={() => callbacks.onClose(row)}>
          <LockIcon />
          Close Period
        </DropdownMenuItem>
      ) : (
        <DropdownMenuItem onClick={() => callbacks.onReopen(row)}>
          <UnlockIcon />
          Reopen Period
        </DropdownMenuItem>
      )
    )
  }

  return [
    getSelectColumn<AccountingPeriod>({
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
      accessorKey: 'name',
      header: 'Period',
      cell: ({ row }) => (
        <span className="font-medium">{row.original.name}</span>
      ),
      enableSorting: true,
    },
    {
      accessorKey: 'status',
      header: 'Status',
      cell: ({ row }) => <StatusBadge status={row.original.status} />,
      enableSorting: false,
    },
    {
      accessorKey: 'start_date',
      header: 'Start',
      cell: ({ row }) =>
        new Date(row.original.start_date).toLocaleDateString('en-US', {
          month: 'short',
          day: 'numeric',
          year: 'numeric',
        }),
      enableSorting: true,
    },
    {
      accessorKey: 'end_date',
      header: 'End',
      cell: ({ row }) =>
        new Date(row.original.end_date).toLocaleDateString('en-US', {
          month: 'short',
          day: 'numeric',
          year: 'numeric',
        }),
      enableSorting: true,
    },
    {
      accessorKey: 'closed_at',
      header: 'Closed At',
      cell: ({ row }) =>
        row.original.closed_at
          ? new Date(row.original.closed_at).toLocaleDateString('en-US', {
              month: 'short',
              day: 'numeric',
              year: 'numeric',
            })
          : '—',
      enableSorting: false,
    },
    {
      accessorKey: 'reopen_reason',
      header: 'Reopen Reason',
      cell: ({ row }) => row.original.reopen_reason ?? '—',
      enableSorting: false,
    },
  ]
}
