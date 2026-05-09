'use client'

import { useCallback, useMemo, useState } from 'react'
import type { Row } from '@tanstack/react-table'
import { DataTable } from '@/components/data-table/data-table'
import { useKitchen } from '@/hooks/use-kitchen'
import { useServerTable } from '@/hooks/use-server-table'
import type { OrderRow } from '@/lib/types/orders'
import { getOrderColumns } from './order-columns'
import { OrderDetailSheet } from './order-detail-sheet'
import { OrdersSiteHeader } from './orders-site-header'
import {
  ORDERS_FROM,
  ORDERS_QUERY_KEY,
  ORDERS_SELECT,
} from '../_lib/queries'

export function OrdersMain() {
  const { kitchen, permissions } = useKitchen()
  const [detailOrder, setDetailOrder] = useState<OrderRow | null>(null)

  const handleOpen = useCallback((row: Row<OrderRow>) => {
    setDetailOrder(row.original)
  }, [])

  const columns = useMemo(
    () => getOrderColumns({ onOpen: handleOpen }),
    [handleOpen]
  )

  const { table, isFetching, search, setSearch } = useServerTable<OrderRow>({
    queryKey: ORDERS_QUERY_KEY,
    from: ORDERS_FROM,
    select: ORDERS_SELECT,
    columns,
    searchColumn: 'source_order_code',
    kitchenId: kitchen.id,
    defaultSort: [{ id: 'created_at', desc: true }],
  })

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <OrdersSiteHeader
        table={table}
        search={search}
        onSearchChange={setSearch}
      />
      <DataTable table={table} isFetching={isFetching} />
      <OrderDetailSheet
        order={detailOrder}
        open={detailOrder !== null}
        onOpenChange={(next) => {
          if (!next) setDetailOrder(null)
        }}
        kitchenId={kitchen.id}
        canUpdate={permissions.has('orders.update')}
        canAction={permissions.has('orders.action')}
      />
    </div>
  )
}
