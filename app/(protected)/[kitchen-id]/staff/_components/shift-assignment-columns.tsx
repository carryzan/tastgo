'use client'

import type { ReactNode } from 'react'
import type { ColumnDef, Row } from '@tanstack/react-table'
import { LogInIcon, LogOutIcon } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { DropdownMenuItem } from '@/components/ui/dropdown-menu'
import { getSelectColumn } from '@/components/data-table/data-table-select-column'
import { DataTableRowActions } from '@/components/data-table/data-table-row-actions'
import type { ColumnConfig, Permission } from '@/lib/types/data-table'
import type { ShiftAssignment } from '../_lib/queries'

function formatDateTime(value: string | null) {
  if (!value) return '—'
  return new Date(value).toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })
}

function getAssignmentStatus(assignment: ShiftAssignment) {
  if (assignment.checked_out_at) {
    return { label: 'Checked Out', variant: 'outline' as const }
  }

  if (assignment.checked_in_at) {
    return { label: 'Checked In', variant: 'secondary' as const }
  }

  return { label: 'Scheduled', variant: 'default' as const }
}

function uniqueOptions(values: Array<string | null | undefined>) {
  return [...new Set(values.map((value) => value?.trim()).filter(Boolean))] as string[]
}

export function getShiftAssignmentColumnConfigs(lookups: {
  staffNames: string[]
  shiftNames: string[]
}): ColumnConfig[] {
  return [
    {
      column: 'staff_member.full_name',
      label: 'Staff',
      type: 'select',
      options: uniqueOptions(lookups.staffNames),
    },
    {
      column: 'shift.name',
      label: 'Shift',
      type: 'select',
      options: uniqueOptions(lookups.shiftNames),
    },
    { column: 'shift.shift_date', label: 'Shift Date', type: 'date', sortable: true },
  ]
}

export function getShiftAssignmentColumns(
  permissions: Permission,
  callbacks: {
    onEdit: (row: Row<ShiftAssignment>) => void
    onDelete: (row: Row<ShiftAssignment>) => void
    onCheckIn: (row: Row<ShiftAssignment>) => void
    onCheckOut: (row: Row<ShiftAssignment>) => void
    canManageAttendance: boolean
  }
): ColumnDef<ShiftAssignment>[] {
  const showRowActions = Boolean(
    permissions.canEdit || permissions.canDelete || callbacks.canManageAttendance
  )

  const extraItems = (row: Row<ShiftAssignment>): ReactNode => {
    const assignment = row.original
    if (!callbacks.canManageAttendance) return null

    return (
      <>
        {!assignment.checked_in_at ? (
          <DropdownMenuItem onClick={() => callbacks.onCheckIn(row)}>
            <LogInIcon />
            Check In
          </DropdownMenuItem>
        ) : null}
        {assignment.checked_in_at && !assignment.checked_out_at ? (
          <DropdownMenuItem onClick={() => callbacks.onCheckOut(row)}>
            <LogOutIcon />
            Check Out
          </DropdownMenuItem>
        ) : null}
      </>
    )
  }

  return [
    getSelectColumn<ShiftAssignment>(
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
      id: 'staff_member',
      header: 'Staff',
      cell: ({ row }) => row.original.staff_member?.full_name ?? 'Restricted',
      enableSorting: false,
    },
    {
      id: 'shift',
      header: 'Shift',
      cell: ({ row }) => {
        const shift = row.original.shift
        return shift ? (
          <div className="flex flex-col">
            <span className="font-medium">{shift.name}</span>
            <span className="text-xs text-muted-foreground">
              {new Date(`${shift.shift_date}T00:00:00`).toLocaleDateString('en-US', {
                month: 'short',
                day: 'numeric',
              })}
            </span>
          </div>
        ) : (
          '—'
        )
      },
      enableSorting: false,
    },
    {
      id: 'window',
      header: 'Window',
      cell: ({ row }) => {
        const shift = row.original.shift
        if (!shift) return '—'
        return (
          <div className="flex flex-col">
            <span>{formatDateTime(shift.start_time)}</span>
            <span className="text-xs text-muted-foreground">
              to {formatDateTime(shift.end_time)}
            </span>
          </div>
        )
      },
      enableSorting: false,
    },
    {
      id: 'attendance_status',
      header: 'Status',
      cell: ({ row }) => {
        const status = getAssignmentStatus(row.original)
        return <Badge variant={status.variant}>{status.label}</Badge>
      },
      enableSorting: false,
    },
    {
      accessorKey: 'checked_in_at',
      header: 'Checked In',
      cell: ({ row }) => formatDateTime(row.original.checked_in_at),
      enableSorting: false,
    },
    {
      accessorKey: 'checked_out_at',
      header: 'Checked Out',
      cell: ({ row }) => formatDateTime(row.original.checked_out_at),
      enableSorting: false,
    },
  ]
}
