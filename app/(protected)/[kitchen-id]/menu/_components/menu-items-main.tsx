'use client'

import type { Table } from '@tanstack/react-table'
import { DataTable } from '@/components/data-table/data-table'
import type { MenuItem } from './menu-item-columns'

interface MenuItemsMainProps {
  table: Table<MenuItem>
  isFetching: boolean
}

export function MenuItemsMain({ table, isFetching }: MenuItemsMainProps) {
  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <DataTable table={table} isFetching={isFetching} />
    </div>
  )
}
