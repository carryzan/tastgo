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
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent } from '@/components/ui/tabs'
import {
  STOCK_COUNT_SESSIONS_FROM,
  STOCK_COUNT_SESSIONS_QUERY_KEY,
  STOCK_COUNT_SESSIONS_SELECT,
  WASTE_LEDGER_FROM,
  WASTE_LEDGER_QUERY_KEY,
  WASTE_LEDGER_SELECT,
} from '../_lib/queries'
import {
  getStockCountSessionColumns,
  stockCountSessionColumnConfigs,
  type StockCountSession,
} from './stock-count-session-columns'
import {
  getWasteColumns,
  wasteColumnConfigs,
  type WasteLedgerEntry,
} from './waste-columns'
import { NewCountDialog } from './new-count-dialog'
import { RecordWasteSheet } from './record-waste-sheet'
import { ReverseWasteDialog } from './reverse-waste-dialog'
import { StockControlSiteHeader } from './stock-control-site-header'

export function StockControlMain() {
  const { kitchen, permissions } = useKitchen()
  const router = useRouter()
  const [activeTab, setActiveTab] = useState('stock-counts')
  const [wasteOpen, setWasteOpen] = useState(false)
  const [reverseWasteTarget, setReverseWasteTarget] =
    useState<WasteLedgerEntry | null>(null)

  const sessionColumns = useMemo(
    () =>
      getStockCountSessionColumns({
        onOpen: (row: Row<StockCountSession>) => {
          router.push(`/${kitchen.id}/stock-control/stock-counts/${row.original.id}`)
        },
      }),
    [kitchen.id, router]
  )

  const {
    table: stockCountTable,
    isFetching: stockCountsFetching,
    search: stockCountSearch,
    setSearch: setStockCountSearch,
  } = useServerTable<StockCountSession>({
    queryKey: STOCK_COUNT_SESSIONS_QUERY_KEY,
    from: STOCK_COUNT_SESSIONS_FROM,
    select: STOCK_COUNT_SESSIONS_SELECT,
    columns: sessionColumns,
    searchColumn: 'type',
    kitchenId: kitchen.id,
    defaultSort: [{ id: 'created_at', desc: true }],
  })

  const canReverseWaste = permissions.has('stock_count.update')
  const handleReverseWaste = useCallback((row: Row<WasteLedgerEntry>) => {
    setReverseWasteTarget(row.original)
  }, [])

  const wasteColumns = useMemo(
    () =>
      getWasteColumns({
        onReverse: handleReverseWaste,
        canReverse: canReverseWaste,
      }),
    [canReverseWaste, handleReverseWaste]
  )

  const {
    table: wasteTable,
    isFetching: wasteFetching,
    search: wasteSearch,
    setSearch: setWasteSearch,
  } = useServerTable<WasteLedgerEntry>({
    queryKey: WASTE_LEDGER_QUERY_KEY,
    from: WASTE_LEDGER_FROM,
    select: WASTE_LEDGER_SELECT,
    columns: wasteColumns,
    searchColumn: 'reason',
    kitchenId: kitchen.id,
    defaultSort: [{ id: 'created_at', desc: true }],
  })

  const canCreateCount = permissions.has('stock_count.create')

  const stockCountsToolbar: ReactNode = (
    <>
      <ExpandableSearch value={stockCountSearch} onChange={setStockCountSearch} />
      <DataTableFilter
        table={stockCountTable}
        columnConfigs={stockCountSessionColumnConfigs}
      />
      <DataTableSort
        table={stockCountTable}
        columnConfigs={stockCountSessionColumnConfigs}
      />
      {canCreateCount && <NewCountDialog />}
    </>
  )

  const wasteToolbar: ReactNode = (
    <>
      <ExpandableSearch value={wasteSearch} onChange={setWasteSearch} />
      <DataTableFilter table={wasteTable} columnConfigs={wasteColumnConfigs} />
      <DataTableSort table={wasteTable} columnConfigs={wasteColumnConfigs} />
      {canCreateCount && (
        <Button size="sm" onClick={() => setWasteOpen(true)}>
          Record Waste
        </Button>
      )}
    </>
  )

  return (
    <>
      <Tabs
        value={activeTab}
        onValueChange={setActiveTab}
        className="flex min-h-0 flex-1 flex-col gap-0"
      >
        <StockControlSiteHeader
          activeTab={activeTab}
          stockCountsToolbar={stockCountsToolbar}
          wasteToolbar={wasteToolbar}
        />
        <TabsContent
          value="stock-counts"
          className="mt-0 flex min-h-0 flex-1 flex-col"
        >
          <DataTable table={stockCountTable} isFetching={stockCountsFetching} />
        </TabsContent>
        <TabsContent
          value="waste"
          className="mt-0 flex min-h-0 flex-1 flex-col"
        >
          <DataTable table={wasteTable} isFetching={wasteFetching} />
        </TabsContent>
      </Tabs>

      <RecordWasteSheet open={wasteOpen} onOpenChange={setWasteOpen} />
      {reverseWasteTarget ? (
        <ReverseWasteDialog
          kitchenId={kitchen.id}
          waste={reverseWasteTarget}
          open={reverseWasteTarget !== null}
          onOpenChange={(next) => {
            if (!next) setReverseWasteTarget(null)
          }}
        />
      ) : null}
    </>
  )
}
