'use client'

import type { Table } from '@tanstack/react-table'
import { DataTable } from '@/components/data-table/data-table'
import type { Batch } from './batch-columns'

interface BatchesMainProps {
  table: Table<Batch>
  isFetching: boolean
}

export function BatchesMain({ table, isFetching }: BatchesMainProps) {
  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <DataTable table={table} isFetching={isFetching} />
    </div>
  )
}
