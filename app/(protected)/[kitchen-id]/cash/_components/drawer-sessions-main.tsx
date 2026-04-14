'use client'

import type { Table } from '@tanstack/react-table'
import { DataTable } from '@/components/data-table/data-table'
import type { DrawerSession } from './drawer-session-columns'

interface DrawerSessionsMainProps {
  table: Table<DrawerSession>
  isFetching: boolean
}

export function DrawerSessionsMain({ table, isFetching }: DrawerSessionsMainProps) {
  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <DataTable table={table} isFetching={isFetching} />
    </div>
  )
}
