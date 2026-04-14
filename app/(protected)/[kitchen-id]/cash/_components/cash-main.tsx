'use client'

import { useCallback, useMemo, useState, type ReactNode } from 'react'
import type { Row } from '@tanstack/react-table'
import { useKitchen } from '@/hooks/use-kitchen'
import { useServerTable } from '@/hooks/use-server-table'
import { DataTableDeleteDialog } from '@/components/data-table/data-table-delete-dialog'
import { DataTableFilter } from '@/components/data-table/data-table-filter'
import { DataTableSort } from '@/components/data-table/data-table-sort'
import { ExpandableSearch } from '@/components/shared/expandable-search'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent } from '@/components/ui/tabs'
import type { Permission } from '@/lib/types/data-table'
import {
  CASH_ACCOUNTS_QUERY_KEY,
  CASH_ACCOUNTS_FROM,
  CASH_ACCOUNTS_SELECT,
  CASH_TRANSACTIONS_QUERY_KEY,
  CASH_TRANSACTIONS_FROM,
  CASH_TRANSACTIONS_SELECT,
  DRAWER_SESSIONS_QUERY_KEY,
  DRAWER_SESSIONS_FROM,
  DRAWER_SESSIONS_SELECT,
} from '../_lib/queries'
import {
  getCashAccountColumns,
  cashAccountColumnConfigs,
  type CashAccount,
} from './cash-account-columns'
import {
  getCashTransactionColumns,
  cashTransactionColumnConfigs,
  type CashTransaction,
} from './cash-transaction-columns'
import {
  getDrawerSessionColumns,
  drawerSessionColumnConfigs,
  type DrawerSession,
} from './drawer-session-columns'
import { CashSiteHeader } from './cash-site-header'
import { CashAccountsMain } from './cash-accounts-main'
import { CashTransactionsMain } from './cash-transactions-main'
import { DrawerSessionsMain } from './drawer-sessions-main'
import { AddCashAccountDialog } from './add-cash-account-dialog'
import { EditCashAccountDialog } from './edit-cash-account-dialog'
import { CashAccountTransactionsSheet } from './cash-account-transactions-sheet'
import { AddCashTransactionDialog } from './add-cash-transaction-dialog'
import { DrawerSessionDetailSheet } from './drawer-session-detail-sheet'

export function CashMain() {
  const { kitchen } = useKitchen()
  const [activeTab, setActiveTab] = useState('cash-accounts')

  // Cash account state
  const [addAccountOpen, setAddAccountOpen] = useState(false)
  const [editAccount, setEditAccount] = useState<CashAccount | null>(null)
  const [deleteAccountTarget, setDeleteAccountTarget] =
    useState<CashAccount | null>(null)
  const [transactionsAccount, setTransactionsAccount] =
    useState<CashAccount | null>(null)

  // Transaction state
  const [addTransactionOpen, setAddTransactionOpen] = useState(false)

  // Drawer session state
  const [detailSession, setDetailSession] = useState<DrawerSession | null>(null)

  const accountPermissions = useMemo<Permission>(
    () => ({ canEdit: true, canDelete: true }),
    []
  )

  // Cash account callbacks
  const handleEditAccount = useCallback((row: Row<CashAccount>) => {
    setEditAccount(row.original)
  }, [])

  const handleDeleteAccount = useCallback((row: Row<CashAccount>) => {
    setDeleteAccountTarget(row.original)
  }, [])

  const handleViewTransactions = useCallback((row: Row<CashAccount>) => {
    setTransactionsAccount(row.original)
  }, [])

  const cashAccountColumns = useMemo(
    () =>
      getCashAccountColumns(accountPermissions, {
        onEdit: handleEditAccount,
        onDelete: handleDeleteAccount,
        onViewTransactions: handleViewTransactions,
      }),
    [accountPermissions, handleEditAccount, handleDeleteAccount, handleViewTransactions]
  )

  const {
    table: cashAccountTable,
    isFetching: cashAccountsFetching,
    deleteMutation: cashAccountDeleteMutation,
    search: cashAccountSearch,
    setSearch: setCashAccountSearch,
  } = useServerTable<CashAccount>({
    queryKey: CASH_ACCOUNTS_QUERY_KEY,
    from: CASH_ACCOUNTS_FROM,
    select: CASH_ACCOUNTS_SELECT,
    columns: cashAccountColumns,
    searchColumn: 'name',
    kitchenId: kitchen.id,
  })

  // Cash transaction table (no delete mutation — ledger is immutable)
  const cashTransactionColumns = useMemo(
    () => getCashTransactionColumns(),
    []
  )

  const {
    table: cashTransactionTable,
    isFetching: cashTransactionsFetching,
    search: txSearch,
    setSearch: setTxSearch,
  } = useServerTable<CashTransaction>({
    queryKey: CASH_TRANSACTIONS_QUERY_KEY,
    from: CASH_TRANSACTIONS_FROM,
    select: CASH_TRANSACTIONS_SELECT,
    columns: cashTransactionColumns,
    kitchenId: kitchen.id,
  })

  // Drawer session callbacks
  const handleViewDetails = useCallback((row: Row<DrawerSession>) => {
    setDetailSession(row.original)
  }, [])

  const drawerSessionColumns = useMemo(
    () =>
      getDrawerSessionColumns({
        onViewDetails: handleViewDetails,
      }),
    [handleViewDetails]
  )

  const {
    table: drawerSessionTable,
    isFetching: drawerSessionsFetching,
    search: drawerSearch,
    setSearch: setDrawerSearch,
  } = useServerTable<DrawerSession>({
    queryKey: DRAWER_SESSIONS_QUERY_KEY,
    from: DRAWER_SESSIONS_FROM,
    select: DRAWER_SESSIONS_SELECT,
    columns: drawerSessionColumns,
    kitchenId: kitchen.id,
    defaultSort: [{ id: 'opened_at', desc: true }],
  })

  const cashAccountsToolbar: ReactNode = (
    <>
      <ExpandableSearch value={cashAccountSearch} onChange={setCashAccountSearch} />
      <DataTableFilter
        table={cashAccountTable}
        columnConfigs={cashAccountColumnConfigs}
      />
      <DataTableSort
        table={cashAccountTable}
        columnConfigs={cashAccountColumnConfigs}
      />
      <Button size="sm" onClick={() => setAddAccountOpen(true)}>
        Add Account
      </Button>
    </>
  )

  const transactionsToolbar: ReactNode = (
    <>
      <ExpandableSearch value={txSearch} onChange={setTxSearch} />
      <DataTableFilter
        table={cashTransactionTable}
        columnConfigs={cashTransactionColumnConfigs}
      />
      <DataTableSort
        table={cashTransactionTable}
        columnConfigs={cashTransactionColumnConfigs}
      />
      <Button size="sm" onClick={() => setAddTransactionOpen(true)}>
        Add Transaction
      </Button>
    </>
  )

  const drawerToolbar: ReactNode = (
    <>
      <ExpandableSearch value={drawerSearch} onChange={setDrawerSearch} />
      <DataTableFilter
        table={drawerSessionTable}
        columnConfigs={drawerSessionColumnConfigs}
      />
      <DataTableSort
        table={drawerSessionTable}
        columnConfigs={drawerSessionColumnConfigs}
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
        <CashSiteHeader
          activeTab={activeTab}
          cashAccountsToolbar={cashAccountsToolbar}
          transactionsToolbar={transactionsToolbar}
          drawerToolbar={drawerToolbar}
        />
        <TabsContent
          value="cash-accounts"
          className="mt-0 flex min-h-0 flex-1 flex-col"
        >
          <CashAccountsMain
            table={cashAccountTable}
            isFetching={cashAccountsFetching}
          />
        </TabsContent>
        <TabsContent
          value="transactions"
          className="mt-0 flex min-h-0 flex-1 flex-col"
        >
          <CashTransactionsMain
            table={cashTransactionTable}
            isFetching={cashTransactionsFetching}
          />
        </TabsContent>
        <TabsContent
          value="drawer"
          className="mt-0 flex min-h-0 flex-1 flex-col"
        >
          <DrawerSessionsMain
            table={drawerSessionTable}
            isFetching={drawerSessionsFetching}
          />
        </TabsContent>
      </Tabs>

      {/* Cash account dialogs / sheets */}
      <AddCashAccountDialog
        open={addAccountOpen}
        onOpenChange={setAddAccountOpen}
        kitchenId={kitchen.id}
      />

      {editAccount && (
        <EditCashAccountDialog
          account={editAccount}
          open
          onOpenChange={(next) => {
            if (!next) setEditAccount(null)
          }}
        />
      )}

      {transactionsAccount && (
        <CashAccountTransactionsSheet
          account={transactionsAccount}
          open
          onOpenChange={(next) => {
            if (!next) setTransactionsAccount(null)
          }}
        />
      )}

      {/* Transaction dialog */}
      <AddCashTransactionDialog
        open={addTransactionOpen}
        onOpenChange={setAddTransactionOpen}
      />

      {/* Drawer session detail */}
      {detailSession && (
        <DrawerSessionDetailSheet
          session={detailSession}
          open
          onOpenChange={(next) => {
            if (!next) setDetailSession(null)
          }}
        />
      )}

      {/* Delete dialog for accounts */}
      <DataTableDeleteDialog
        open={deleteAccountTarget !== null}
        onOpenChange={(open) => {
          if (!open) setDeleteAccountTarget(null)
        }}
        onConfirm={() => {
          if (deleteAccountTarget) {
            cashAccountDeleteMutation.mutate(deleteAccountTarget, {
              onSuccess: () => setDeleteAccountTarget(null),
            })
          }
        }}
        isLoading={cashAccountDeleteMutation.isPending}
      />
    </>
  )
}
