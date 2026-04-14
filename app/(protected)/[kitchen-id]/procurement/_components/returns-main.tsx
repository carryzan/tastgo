'use client'

import type { Table } from '@tanstack/react-table'
import { DataTable } from '@/components/data-table/data-table'
import type { SupplierReturn } from './return-columns'

interface ReturnsMainProps {
  table: Table<SupplierReturn>
  isFetching: boolean
}

export function ReturnsMain({ table, isFetching }: ReturnsMainProps) {
  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <DataTable table={table} isFetching={isFetching} />
    </div>
  )
}
