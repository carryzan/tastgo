'use client'

import type { ReactNode } from 'react'
import type { Row } from '@tanstack/react-table'
import { MoreHorizontalIcon, PencilIcon, TrashIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import type { Permission } from '@/lib/types/data-table'

interface DataTableRowActionsProps<TData> {
  row: Row<TData>
  permissions: Permission
  onEdit: (row: Row<TData>) => void
  onDelete: (row: Row<TData>) => void
  extraItems?: (row: Row<TData>) => ReactNode
}

export function DataTableRowActions<TData>({
  row,
  permissions,
  onEdit,
  onDelete,
  extraItems,
}: DataTableRowActionsProps<TData>) {
  const { canEdit, canDelete } = permissions

  if (!canEdit && !canDelete) return null

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon-xs">
          <MoreHorizontalIcon />
          <span className="sr-only">Open menu</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        onCloseAutoFocus={(event) => event.preventDefault()}
      >
        {canEdit && (
          <DropdownMenuItem onClick={() => onEdit(row)}>
            <PencilIcon />
            Edit
          </DropdownMenuItem>
        )}
        {extraItems?.(row)}
        {canDelete && (
          <DropdownMenuItem
            variant="destructive"
            onClick={() => onDelete(row)}
          >
            <TrashIcon />
            Delete
          </DropdownMenuItem>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

