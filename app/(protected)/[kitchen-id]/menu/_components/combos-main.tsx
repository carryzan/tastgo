'use client'

import type { Table } from '@tanstack/react-table'
import { DataTable } from '@/components/data-table/data-table'
import type { Combo } from './combo-columns'

interface CombosMainProps {
  table: Table<Combo>
  isFetching: boolean
}

export function CombosMain({ table, isFetching }: CombosMainProps) {
  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <DataTable table={table} isFetching={isFetching} />
    </div>
  )
}
