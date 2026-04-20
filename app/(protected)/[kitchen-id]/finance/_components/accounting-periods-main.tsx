'use client'

import type { Table } from '@tanstack/react-table'
import { DataTable } from '@/components/data-table/data-table'
import type { AccountingPeriod } from './accounting-period-columns'

interface AccountingPeriodsMainProps {
  table: Table<AccountingPeriod>
  isFetching: boolean
}

export function AccountingPeriodsMain({
  table,
  isFetching,
}: AccountingPeriodsMainProps) {
  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <DataTable table={table} isFetching={isFetching} />
    </div>
  )
}
