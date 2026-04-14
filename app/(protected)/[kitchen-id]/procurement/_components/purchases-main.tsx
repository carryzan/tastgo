'use client'

import type { Table } from '@tanstack/react-table'
import { DataTable } from '@/components/data-table/data-table'
import type { Purchase } from './purchase-columns'

interface PurchasesMainProps {
  table: Table<Purchase>
  isFetching: boolean
}

export function PurchasesMain({ table, isFetching }: PurchasesMainProps) {
  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <DataTable table={table} isFetching={isFetching} />
    </div>
  )
}
