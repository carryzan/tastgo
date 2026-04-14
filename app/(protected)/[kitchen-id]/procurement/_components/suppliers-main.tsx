'use client'

import type { Table } from '@tanstack/react-table'
import { DataTable } from '@/components/data-table/data-table'
import type { Supplier } from './supplier-columns'

interface SuppliersMainProps {
  table: Table<Supplier>
  isFetching: boolean
}

export function SuppliersMain({ table, isFetching }: SuppliersMainProps) {
  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <DataTable table={table} isFetching={isFetching} />
    </div>
  )
}
