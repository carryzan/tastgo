'use client'

import type { ReactNode } from 'react'
import type { ColumnDef, Row } from '@tanstack/react-table'
import { FileTextIcon } from 'lucide-react'
import { DropdownMenuItem } from '@/components/ui/dropdown-menu'
import { getSelectColumn } from '@/components/data-table/data-table-select-column'
import { DataTableRowActions } from '@/components/data-table/data-table-row-actions'
import type { ColumnConfig } from '@/lib/types/data-table'

export interface DrawerSession {
  id: string
  kitchen_id: string
  status: 'open' | 'closed'
  opening_balance: string | number
  expected_closing_balance: string | number
  actual_closing_balance: string | number | null
  variance: string | number | null
  variance_type: 'overage' | 'shortage' | 'exact' | null
  opened_by: string
  closed_by: string | null
  opened_at: string
  closed_at: string | null
  updated_at: string
  drawer_account_id: string
  reopened_by: string | null
  reopened_at: string | null
  reopen_reason: string | null
  opened_member: { id: string; profiles: { full_name: string } | null } | null
  closed_member: { id: string; profiles: { full_name: string } | null } | null
  reopened_member: { id: string; profiles: { full_name: string } | null } | null
  drawer_account: { id: string; code: string; name: string } | null
}

export const drawerSessionColumnConfigs: ColumnConfig[] = [
  {
    column: 'status',
    label: 'Status',
    type: 'select',
    options: ['open', 'closed'],
  },
  {
    column: 'opening_balance',
    label: 'Opening Balance',
    type: 'number',
    sortable: true,
  },
  { column: 'opened_at', label: 'Opened At', type: 'date', sortable: true },
  { column: 'closed_at', label: 'Closed At', type: 'date', sortable: true },
]

function formatAmount(value: string | number | null) {
  if (value === null || value === undefined) return '—'
  const n = typeof value === 'string' ? Number(value) : value
  if (Number.isNaN(n)) return '—'
  return n.toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 3,
  })
}

function StatusBadge({ session }: { session: DrawerSession }) {
  const styles = {
    open: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
    closed: 'bg-muted text-muted-foreground',
  }
  return (
    <span className="inline-flex items-center gap-1.5">
      <span
        className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium capitalize ${styles[session.status]}`}
      >
        {session.status}
      </span>
      {session.status === 'open' && session.reopened_at !== null && (
        <span className="inline-flex items-center rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-800 dark:bg-amber-900/30 dark:text-amber-400">
          Reopened
        </span>
      )}
    </span>
  )
}

function VarianceCell({
  variance,
  varianceType,
}: {
  variance: string | number | null
  varianceType: DrawerSession['variance_type']
}) {
  if (variance === null || varianceType === null) return <span>—</span>

  const n = typeof variance === 'string' ? Number(variance) : variance
  const formatted = formatAmount(Math.abs(n))

  const styles = {
    overage: 'text-green-600 dark:text-green-400',
    shortage: 'text-destructive',
    exact: 'text-muted-foreground',
  }

  const labels = {
    overage: `+${formatted}`,
    shortage: `-${formatted}`,
    exact: formatted,
  }

  return (
    <span className={`font-medium ${styles[varianceType]}`}>
      {labels[varianceType]}
    </span>
  )
}

export function getDrawerSessionColumns(callbacks: {
  onViewDetails: (row: Row<DrawerSession>) => void
}): ColumnDef<DrawerSession>[] {
  const extraItems = (row: Row<DrawerSession>): ReactNode => (
    <DropdownMenuItem onClick={() => callbacks.onViewDetails(row)}>
      <FileTextIcon />
      View Details
    </DropdownMenuItem>
  )

  return [
    getSelectColumn<DrawerSession>({
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
      accessorKey: 'status',
      header: 'Status',
      cell: ({ row }) => <StatusBadge session={row.original} />,
      enableSorting: false,
    },
    {
      id: 'drawer_account',
      header: 'Drawer Account',
      cell: ({ row }) => {
        const acct = row.original.drawer_account
        if (!acct) return '—'
        return `${acct.code} · ${acct.name}`
      },
      enableSorting: false,
    },
    {
      accessorKey: 'opening_balance',
      header: 'Opening Balance',
      cell: ({ row }) => formatAmount(row.original.opening_balance),
      enableSorting: true,
    },
    {
      accessorKey: 'expected_closing_balance',
      header: 'Expected Closing',
      cell: ({ row }) => formatAmount(row.original.expected_closing_balance),
      enableSorting: false,
    },
    {
      accessorKey: 'actual_closing_balance',
      header: 'Actual Closing',
      cell: ({ row }) => formatAmount(row.original.actual_closing_balance),
      enableSorting: false,
    },
    {
      id: 'variance',
      header: 'Variance',
      cell: ({ row }) => (
        <VarianceCell
          variance={row.original.variance}
          varianceType={row.original.variance_type}
        />
      ),
      enableSorting: false,
    },
    {
      id: 'opened_member',
      header: 'Opened By',
      cell: ({ row }) =>
        row.original.opened_member?.profiles?.full_name ?? '—',
      enableSorting: false,
    },
    {
      accessorKey: 'opened_at',
      header: 'Opened At',
      cell: ({ row }) =>
        new Date(row.original.opened_at).toLocaleDateString('en-US', {
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
      enableSorting: true,
    },
  ]
}
