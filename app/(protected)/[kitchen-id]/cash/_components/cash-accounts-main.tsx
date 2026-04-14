'use client'

import type { Table } from '@tanstack/react-table'
import { DataTable } from '@/components/data-table/data-table'
import type { CashAccount } from './cash-account-columns'

interface CashAccountsMainProps {
  table: Table<CashAccount>
  isFetching: boolean
}

export function CashAccountsMain({ table, isFetching }: CashAccountsMainProps) {
  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <DataTable table={table} isFetching={isFetching} />
    </div>
  )
}
