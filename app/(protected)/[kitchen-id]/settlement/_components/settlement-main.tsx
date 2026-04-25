'use client'

import { useCallback, useMemo, useState, type ReactNode } from 'react'
import { useRouter } from 'next/navigation'
import type { Row } from '@tanstack/react-table'
import { useKitchen } from '@/hooks/use-kitchen'
import { useServerTable } from '@/hooks/use-server-table'
import { DataTable } from '@/components/data-table/data-table'
import { DataTableFilter } from '@/components/data-table/data-table-filter'
import { DataTableSort } from '@/components/data-table/data-table-sort'
import { ExpandableSearch } from '@/components/shared/expandable-search'
import { Tabs, TabsContent } from '@/components/ui/tabs'
import {
  OFFLINE_SETTLEMENTS_FROM,
  OFFLINE_SETTLEMENTS_QUERY_KEY,
  OFFLINE_SETTLEMENTS_SELECT,
  ONLINE_SETTLEMENTS_FROM,
  ONLINE_SETTLEMENTS_QUERY_KEY,
  ONLINE_SETTLEMENTS_SELECT,
} from '../_lib/queries'
import {
  getOfflineSettlementColumns,
  offlineSettlementColumnConfigs,
  type OfflineSettlement,
} from './offline-settlement-columns'
import {
  getOnlineSettlementColumns,
  onlineSettlementColumnConfigs,
  type OnlineSettlement,
} from './online-settlement-columns'
import { NewOnlineSettlementDialog } from './new-online-settlement-dialog'
import { ReverseOfflineSettlementDialog } from './reverse-offline-settlement-dialog'
import { SettlementSiteHeader } from './settlement-site-header'

export function SettlementMain() {
  const { kitchen, permissions } = useKitchen()
  const router = useRouter()
  const [activeTab, setActiveTab] = useState('online')
  const [reverseOfflineTarget, setReverseOfflineTarget] =
    useState<OfflineSettlement | null>(null)

  const onlineColumns = useMemo(
    () =>
      getOnlineSettlementColumns({
        onOpen: (row: Row<OnlineSettlement>) => {
          router.push(`/${kitchen.id}/settlement/online/${row.original.id}`)
        },
      }),
    [kitchen.id, router]
  )

  const {
    table: onlineTable,
    isFetching: onlineFetching,
    search: onlineSearch,
    setSearch: setOnlineSearch,
  } = useServerTable<OnlineSettlement>({
    queryKey: ONLINE_SETTLEMENTS_QUERY_KEY,
    from: ONLINE_SETTLEMENTS_FROM,
    select: ONLINE_SETTLEMENTS_SELECT,
    columns: onlineColumns,
    searchColumn: 'sources.name',
    kitchenId: kitchen.id,
    defaultSort: [{ id: 'created_at', desc: true }],
  })

  const canReverseOffline = permissions.has('settlement.update')
  const handleReverseOffline = useCallback((row: Row<OfflineSettlement>) => {
    setReverseOfflineTarget(row.original)
  }, [])

  const offlineColumns = useMemo(
    () =>
      getOfflineSettlementColumns({
        onReverse: handleReverseOffline,
        canReverse: canReverseOffline,
      }),
    [canReverseOffline, handleReverseOffline]
  )

  const {
    table: offlineTable,
    isFetching: offlineFetching,
    search: offlineSearch,
    setSearch: setOfflineSearch,
  } = useServerTable<OfflineSettlement>({
    queryKey: OFFLINE_SETTLEMENTS_QUERY_KEY,
    from: OFFLINE_SETTLEMENTS_FROM,
    select: OFFLINE_SETTLEMENTS_SELECT,
    columns: offlineColumns,
    searchColumn: 'orders.source_order_code',
    kitchenId: kitchen.id,
    defaultSort: [{ id: 'created_at', desc: true }],
  })

  const canCreateOnline = permissions.has('settlement.create')

  const onlineToolbar: ReactNode = (
    <>
      <ExpandableSearch value={onlineSearch} onChange={setOnlineSearch} />
      <DataTableFilter
        table={onlineTable}
        columnConfigs={onlineSettlementColumnConfigs}
      />
      <DataTableSort
        table={onlineTable}
        columnConfigs={onlineSettlementColumnConfigs}
      />
      {canCreateOnline && <NewOnlineSettlementDialog />}
    </>
  )

  const offlineToolbar: ReactNode = (
    <>
      <ExpandableSearch value={offlineSearch} onChange={setOfflineSearch} />
      <DataTableFilter
        table={offlineTable}
        columnConfigs={offlineSettlementColumnConfigs}
      />
      <DataTableSort
        table={offlineTable}
        columnConfigs={offlineSettlementColumnConfigs}
      />
    </>
  )

  return (
    <>
      <Tabs
        value={activeTab}
        onValueChange={setActiveTab}
        className="flex min-h-0 flex-1 flex-col gap-0"
      >
        <SettlementSiteHeader
          activeTab={activeTab}
          onlineToolbar={onlineToolbar}
          offlineToolbar={offlineToolbar}
        />
        <TabsContent value="online" className="mt-0 flex min-h-0 flex-1 flex-col">
          <DataTable table={onlineTable} isFetching={onlineFetching} />
        </TabsContent>
        <TabsContent value="offline" className="mt-0 flex min-h-0 flex-1 flex-col">
          <DataTable table={offlineTable} isFetching={offlineFetching} />
        </TabsContent>
      </Tabs>

      {reverseOfflineTarget ? (
        <ReverseOfflineSettlementDialog
          kitchenId={kitchen.id}
          settlement={reverseOfflineTarget}
          open={reverseOfflineTarget !== null}
          onOpenChange={(next) => {
            if (!next) setReverseOfflineTarget(null)
          }}
        />
      ) : null}
    </>
  )
}
