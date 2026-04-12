'use client'

import type { ReactNode } from 'react'
import type { ColumnDef, Row } from '@tanstack/react-table'
import { Checkbox } from '@/components/ui/checkbox'
import { cn } from '@/lib/utils'

export interface GetSelectColumnOptions<TData> {
  renderRowEnd?: (row: Row<TData>) => ReactNode
}

export function getSelectColumn<TData>(
  options?: GetSelectColumnOptions<TData>
): ColumnDef<TData, unknown> {
  const { renderRowEnd } = options ?? {}
  const withTrailing = Boolean(renderRowEnd)

  return {
    id: 'select',
    size: withTrailing ? 80 : 48,
    minSize: withTrailing ? 80 : 48,
    header: ({ table }) => (
      <Checkbox
        checked={
          table.getIsAllPageRowsSelected() ||
          (table.getIsSomePageRowsSelected() && 'indeterminate')
        }
        onCheckedChange={(checked) =>
          table.toggleAllPageRowsSelected(!!checked)
        }
        aria-label="Select all"
      />
    ),
    cell: ({ row }) => (
      <div className="flex items-center gap-1">
        <Checkbox
          checked={row.getIsSelected()}
          onCheckedChange={(checked) => row.toggleSelected(!!checked)}
          disabled={!row.getCanSelect()}
          aria-label="Select row"
        />
        {renderRowEnd ? (
          <div
            className={cn(
              'flex shrink-0 transition-opacity duration-150',
              'opacity-0 pointer-events-none',
              'group-hover/row:opacity-100 group-hover/row:pointer-events-auto',
              'focus-within:opacity-100 focus-within:pointer-events-auto',
              '[&:has([data-state=open])]:opacity-100 [&:has([data-state=open])]:pointer-events-auto'
            )}
          >
            {renderRowEnd(row)}
          </div>
        ) : null}
      </div>
    ),
    enableSorting: false,
    enableHiding: false,
  }
}
