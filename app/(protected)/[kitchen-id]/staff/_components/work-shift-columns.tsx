'use client'

import type { ColumnDef, Row } from '@tanstack/react-table'
import { getSelectColumn } from '@/components/data-table/data-table-select-column'
import { DataTableRowActions } from '@/components/data-table/data-table-row-actions'
import type { ColumnConfig, Permission } from '@/lib/types/data-table'
import type { WorkShift } from '../_lib/queries'

export const workShiftColumnConfigs: ColumnConfig[] = [
  { column: 'name', label: 'Name', type: 'text', sortable: true },
  { column: 'shift_date', label: 'Shift Date', type: 'date', sortable: true },
  { column: 'start_time', label: 'Starts', type: 'date', sortable: true },
]

function formatDate(value: string) {
  return new Date(`${value}T00:00:00`).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

function formatDateTime(value: string) {
  return new Date(value).toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })
}

export function getWorkShiftColumns(
  permissions: Permission,
  callbacks: {
    onEdit: (row: Row<WorkShift>) => void
    onDelete: (row: Row<WorkShift>) => void
  }
): ColumnDef<WorkShift>[] {
  const showRowActions = Boolean(permissions.canEdit || permissions.canDelete)

  return [
    getSelectColumn<WorkShift>(
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
      header: 'Shift',
      cell: ({ row }) => <span className="font-medium">{row.original.name}</span>,
      enableSorting: true,
    },
    {
      accessorKey: 'shift_date',
      header: 'Date',
      cell: ({ row }) => formatDate(row.original.shift_date),
      enableSorting: true,
    },
    {
      accessorKey: 'start_time',
      header: 'Window',
      cell: ({ row }) => (
        <div className="flex flex-col">
          <span>{formatDateTime(row.original.start_time)}</span>
          <span className="text-xs text-muted-foreground">
            to {formatDateTime(row.original.end_time)}
          </span>
        </div>
      ),
      enableSorting: true,
    },
    {
      id: 'created_by',
      header: 'Created By',
      cell: ({ row }) => row.original.created_member?.profiles?.full_name ?? '—',
      enableSorting: false,
    },
  ]
}
