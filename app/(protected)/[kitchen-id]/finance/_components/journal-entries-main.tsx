'use client'

import type { Table } from '@tanstack/react-table'
import { DataTable } from '@/components/data-table/data-table'
import type { JournalEntry } from './journal-entry-columns'

interface JournalEntriesMainProps {
  table: Table<JournalEntry>
  isFetching: boolean
}

export function JournalEntriesMain({
  table,
  isFetching,
}: JournalEntriesMainProps) {
  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <DataTable table={table} isFetching={isFetching} />
    </div>
  )
}
