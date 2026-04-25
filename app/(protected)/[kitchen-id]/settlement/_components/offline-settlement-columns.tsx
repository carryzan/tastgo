'use client'

import type { ReactNode } from 'react'
import type { ColumnDef, Row } from '@tanstack/react-table'
import { RotateCcwIcon } from 'lucide-react'
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

interface AccountDisplay {
  id: string
  code: string
  name: string
}

interface JournalReference {
  id: string
  journal_number: number
}

interface OrderReference {
  id: string
  order_number: number
  source_order_code: string | null
}

export interface OfflineSettlement {
  id: string
  kitchen_id: string
  order_id: string
  amount: string | number
  settlement_account_id: string
  journal_entry_id: string | null
  status: 'settled' | 'reversed'
  reversed_by: string | null
  reversed_at: string | null
  reversal_reason: string | null
  reversal_journal_entry_id: string | null
  created_by: string | null
  created_at: string
  order: OrderReference | null
  settlement_account: AccountDisplay | null
  journal_entry: JournalReference | null
  reversal_journal_entry: JournalReference | null
  created_member: MemberDisplay | null
  reversed_member: MemberDisplay | null
}

export const offlineSettlementColumnConfigs: ColumnConfig[] = [
  {
    column: 'status',
    label: 'Status',
    type: 'select',
    options: ['settled', 'reversed'],
    sortable: true,
  },
  { column: 'amount', label: 'Amount', type: 'number', sortable: true },
  { column: 'created_at', label: 'Created', type: 'date', sortable: true },
  { column: 'reversed_at', label: 'Reversed', type: 'date', sortable: true },
]

export function getOfflineSettlementColumns(callbacks: {
  onReverse: (row: Row<OfflineSettlement>) => void
  canReverse: boolean
}): ColumnDef<OfflineSettlement>[] {
  const extraItems = (row: Row<OfflineSettlement>): ReactNode => {
    const canReverse = callbacks.canReverse && row.original.status === 'settled'

    return canReverse ? (
      <DropdownMenuItem
        onClick={() => callbacks.onReverse(row)}
        className="text-destructive focus:text-destructive"
      >
        <RotateCcwIcon />
        Reverse Settlement
      </DropdownMenuItem>
    ) : null
  }

  return [
    getSelectColumn<OfflineSettlement>({
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
      cell: ({ row }) =>
        row.original.status === 'settled' ? (
          <Badge variant="default">Settled</Badge>
        ) : (
          <Badge variant="outline">Reversed</Badge>
        ),
      enableSorting: true,
    },
    {
      accessorKey: 'order_id',
      header: 'Order #',
      cell: ({ row }) => (
        <span className="font-mono text-sm">
          #{row.original.order?.order_number ?? '-'}
        </span>
      ),
      enableSorting: false,
    },
    {
      id: 'source_order_code',
      header: 'Source Order',
      cell: ({ row }) => row.original.order?.source_order_code ?? '-',
      enableSorting: false,
    },
    {
      accessorKey: 'amount',
      header: 'Amount',
      cell: ({ row }) => formatMoney(row.original.amount),
      enableSorting: true,
    },
    {
      accessorKey: 'settlement_account_id',
      header: 'Account',
      cell: ({ row }) =>
        row.original.settlement_account
          ? `${row.original.settlement_account.code} - ${row.original.settlement_account.name}`
          : '-',
      enableSorting: false,
    },
    {
      accessorKey: 'journal_entry_id',
      header: 'Journal',
      cell: ({ row }) =>
        row.original.journal_entry
          ? `#${row.original.journal_entry.journal_number}`
          : '-',
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
    {
      accessorKey: 'reversed_at',
      header: 'Reversed Date',
      cell: ({ row }) => formatDate(row.original.reversed_at),
      enableSorting: true,
    },
    {
      id: 'reversed_by',
      header: 'Reversed By',
      cell: ({ row }) => memberName(row.original.reversed_member),
      enableSorting: false,
    },
  ]
}
