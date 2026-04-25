'use client'

import type { ReactNode } from 'react'
import type { ColumnDef, Row } from '@tanstack/react-table'
import { ExternalLinkIcon } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { DropdownMenuItem } from '@/components/ui/dropdown-menu'
import { getSelectColumn } from '@/components/data-table/data-table-select-column'
import { DataTableRowActions } from '@/components/data-table/data-table-row-actions'
import type { ColumnConfig } from '@/lib/types/data-table'
import { formatDate, formatMoney, memberName } from '../_lib/format'

interface MemberDisplay {
  id: string
  profiles: { full_name: string | null } | null
}

interface SourceDisplay {
  id: string
  name: string
  type: string
  settlement_mode: string
}

interface AccountDisplay {
  id: string
  code: string
  name: string
}

export interface OnlineSettlement {
  id: string
  kitchen_id: string
  source_id: string
  period_start: string
  period_end: string
  expected_payout: string | number
  actual_deposit: string | number | null
  variance_amount: string | number | null
  status: 'in_progress' | 'completed' | 'reversed'
  settlement_account_id: string | null
  journal_entry_id: string | null
  created_at: string
  completed_at: string | null
  reversed_at: string | null
  source: SourceDisplay | null
  settlement_account: AccountDisplay | null
  created_member: MemberDisplay | null
  completed_member: MemberDisplay | null
  reversed_member: MemberDisplay | null
}

const STATUS_BADGE: Record<
  OnlineSettlement['status'],
  { label: string; variant: 'default' | 'secondary' | 'outline' }
> = {
  in_progress: { label: 'In Progress', variant: 'secondary' },
  completed: { label: 'Completed', variant: 'default' },
  reversed: { label: 'Reversed', variant: 'outline' },
}

export const onlineSettlementColumnConfigs: ColumnConfig[] = [
  {
    column: 'status',
    label: 'Status',
    type: 'select',
    options: ['in_progress', 'completed', 'reversed'],
    sortable: true,
  },
  { column: 'sources.name', label: 'Source', type: 'text' },
  { column: 'period_start', label: 'Period Start', type: 'date', sortable: true },
  { column: 'period_end', label: 'Period End', type: 'date', sortable: true },
  {
    column: 'expected_payout',
    label: 'Expected',
    type: 'number',
    sortable: true,
  },
  {
    column: 'actual_deposit',
    label: 'Actual',
    type: 'number',
    sortable: true,
  },
  { column: 'created_at', label: 'Created', type: 'date', sortable: true },
]

const openOnlyPermissions = { canEdit: false, canDelete: false }

export function getOnlineSettlementColumns(callbacks: {
  onOpen: (row: Row<OnlineSettlement>) => void
}): ColumnDef<OnlineSettlement>[] {
  const extraItems = (row: Row<OnlineSettlement>): ReactNode => (
    <DropdownMenuItem onClick={() => callbacks.onOpen(row)}>
      <ExternalLinkIcon />
      Open Settlement
    </DropdownMenuItem>
  )

  return [
    getSelectColumn<OnlineSettlement>({
      renderRowEnd: (row) => (
        <DataTableRowActions
          row={row}
          permissions={openOnlyPermissions}
          onEdit={() => {}}
          onDelete={() => {}}
          extraItems={extraItems}
        />
      ),
    }),
    {
      accessorKey: 'status',
      header: 'Status',
      cell: ({ row }) => {
        const config = STATUS_BADGE[row.original.status]
        return <Badge variant={config.variant}>{config.label}</Badge>
      },
      enableSorting: true,
    },
    {
      accessorKey: 'source',
      header: 'Source',
      cell: ({ row }) => row.original.source?.name ?? '-',
      enableSorting: false,
    },
    {
      accessorKey: 'period_start',
      header: 'Start Date',
      cell: ({ row }) => formatDate(row.original.period_start),
      enableSorting: true,
    },
    {
      accessorKey: 'period_end',
      header: 'End Date',
      cell: ({ row }) => formatDate(row.original.period_end),
      enableSorting: true,
    },
    {
      accessorKey: 'expected_payout',
      header: 'Expected',
      cell: ({ row }) => formatMoney(row.original.expected_payout),
      enableSorting: true,
    },
    {
      accessorKey: 'actual_deposit',
      header: 'Actual',
      cell: ({ row }) => formatMoney(row.original.actual_deposit),
      enableSorting: true,
    },
    {
      accessorKey: 'variance_amount',
      header: 'Variance',
      cell: ({ row }) => formatMoney(row.original.variance_amount),
      enableSorting: false,
    },
    {
      accessorKey: 'created_at',
      header: 'Created Date',
      cell: ({ row }) => formatDate(row.original.created_at),
      enableSorting: true,
    },
    {
      id: 'created_by',
      header: 'Created By',
      cell: ({ row }) => memberName(row.original.created_member),
      enableSorting: false,
    },
  ]
}
