'use client'

import type { Table } from '@tanstack/react-table'
import { DataTable } from '@/components/data-table/data-table'
import type { ModifierGroup } from './modifier-group-columns'

interface ModifierGroupsMainProps {
  table: Table<ModifierGroup>
  isFetching: boolean
}

export function ModifierGroupsMain({ table, isFetching }: ModifierGroupsMainProps) {
  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <DataTable table={table} isFetching={isFetching} />
    </div>
  )
}
