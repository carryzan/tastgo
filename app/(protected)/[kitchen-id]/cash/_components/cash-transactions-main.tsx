'use client'

import type { Table } from '@tanstack/react-table'
import { DataTable } from '@/components/data-table/data-table'
import type { CashTransaction } from './cash-transaction-columns'

interface CashTransactionsMainProps {
  table: Table<CashTransaction>
  isFetching: boolean
}

export function CashTransactionsMain({ table, isFetching }: CashTransactionsMainProps) {
  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <DataTable table={table} isFetching={isFetching} />
    </div>
  )
}
