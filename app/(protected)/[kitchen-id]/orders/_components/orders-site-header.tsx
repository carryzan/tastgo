'use client'

import type { Table } from '@tanstack/react-table'
import { DataTableFilter } from '@/components/data-table/data-table-filter'
import { DataTableSort } from '@/components/data-table/data-table-sort'
import { SiteHeader } from '@/components/layout/site-header'
import { ExpandableSearch } from '@/components/shared/expandable-search'
import type { OrderRow } from '@/lib/types/orders'
import { orderColumnConfigs } from './order-columns'

interface OrdersSiteHeaderProps {
  table: Table<OrderRow>
  search: string
  onSearchChange: (value: string) => void
}

export function OrdersSiteHeader({
  table,
  search,
  onSearchChange,
}: OrdersSiteHeaderProps) {
  return (
    <SiteHeader title="Orders">
      <div className="flex min-w-0 flex-1 items-center justify-end gap-1">
        <ExpandableSearch value={search} onChange={onSearchChange} />
        <DataTableFilter table={table} columnConfigs={orderColumnConfigs} />
        <DataTableSort table={table} columnConfigs={orderColumnConfigs} />
      </div>
    </SiteHeader>
  )
}
