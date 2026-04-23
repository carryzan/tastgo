'use client'

import type { ReactNode } from 'react'
import type { ColumnDef, Row } from '@tanstack/react-table'
import { ExternalLinkIcon } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { DropdownMenuItem } from '@/components/ui/dropdown-menu'
import { getSelectColumn } from '@/components/data-table/data-table-select-column'
import { DataTableRowActions } from '@/components/data-table/data-table-row-actions'
import type { ColumnConfig } from '@/lib/types/data-table'

interface MemberDisplay {
  id: string
  profiles: { full_name: string | null } | null
}

export interface StockCountSession {
  id: string
  kitchen_id: string
  type: 'full' | 'spot'
  status: 'in_progress' | 'completed'
  created_by: string
  completed_by: string | null
  created_at: string
  completed_at: string | null
  created_member: MemberDisplay | null
  completed_member: MemberDisplay | null
}

const STATUS_BADGE: Record<
  StockCountSession['status'],
  { label: string; variant: 'default' | 'secondary' | 'outline' }
> = {
  in_progress: { label: 'In Progress', variant: 'secondary' },
  completed: { label: 'Completed', variant: 'default' },
}

export const stockCountSessionColumnConfigs: ColumnConfig[] = [
  { column: 'status', label: 'Status', type: 'select', options: ['in_progress', 'completed'], sortable: true },
  { column: 'type', label: 'Type', type: 'select', options: ['full', 'spot'], sortable: true },
  { column: 'created_at', label: 'Created', type: 'date', sortable: true },
  { column: 'completed_at', label: 'Completed', type: 'date', sortable: true },
]

function formatDate(value: string | null) {
  if (!value) return '-'
  return new Date(value).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

const openOnlyPermissions = { canEdit: false, canDelete: false }

function memberName(member: MemberDisplay | null) {
  return member?.profiles?.full_name ?? '-'
}

export function getStockCountSessionColumns(
  callbacks: {
    onOpen: (row: Row<StockCountSession>) => void
  }
): ColumnDef<StockCountSession>[] {
  const extraItems = (row: Row<StockCountSession>): ReactNode => (
    <DropdownMenuItem onClick={() => callbacks.onOpen(row)}>
      <ExternalLinkIcon />
      Open Count
    </DropdownMenuItem>
  )

  return [
    getSelectColumn<StockCountSession>({
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
      accessorKey: 'type',
      header: 'Type',
      cell: ({ row }) => (row.original.type === 'full' ? 'Full' : 'Spot'),
      enableSorting: true,
    },
    {
      accessorKey: 'created_at',
      header: 'Created',
      cell: ({ row }) => (
        <div className="flex min-w-36 flex-col">
          <span>{formatDate(row.original.created_at)}</span>
          <span className="text-xs text-muted-foreground">
            {memberName(row.original.created_member)}
          </span>
        </div>
      ),
      enableSorting: true,
    },
    {
      accessorKey: 'completed_at',
      header: 'Completed',
      cell: ({ row }) => (
        <div className="flex min-w-36 flex-col">
          <span>{formatDate(row.original.completed_at)}</span>
          <span className="text-xs text-muted-foreground">
            {memberName(row.original.completed_member)}
          </span>
        </div>
      ),
      enableSorting: true,
    },
  ]
}
