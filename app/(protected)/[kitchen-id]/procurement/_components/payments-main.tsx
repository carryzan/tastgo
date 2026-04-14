'use client'

import type { Table } from '@tanstack/react-table'
import { DataTable } from '@/components/data-table/data-table'
import type { SupplierPayment } from './payment-columns'

interface PaymentsMainProps {
  table: Table<SupplierPayment>
  isFetching: boolean
}

export function PaymentsMain({ table, isFetching }: PaymentsMainProps) {
  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <DataTable table={table} isFetching={isFetching} />
    </div>
  )
}
