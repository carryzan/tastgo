'use client'

import { useCallback, useMemo, useState, useTransition, type ReactNode } from 'react'
import type { Row } from '@tanstack/react-table'
import { useQueryClient } from '@tanstack/react-query'
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
  CHART_ACCOUNTS_QUERY_KEY,
  CHART_ACCOUNTS_FROM,
  CHART_ACCOUNTS_SELECT,
  DRAWER_SESSIONS_QUERY_KEY,
  DRAWER_SESSIONS_FROM,
  DRAWER_SESSIONS_SELECT,
  JOURNAL_ENTRIES_QUERY_KEY,
  JOURNAL_ENTRIES_FROM,
  JOURNAL_ENTRIES_SELECT,
  ACCOUNTING_PERIODS_QUERY_KEY,
  ACCOUNTING_PERIODS_FROM,
  ACCOUNTING_PERIODS_SELECT,
} from '../_lib/queries'
import { deleteChartAccount } from '../_lib/chart-account-actions'
import {
  getCashAccountColumns,
  cashAccountColumnConfigs,
  type ChartAccount,
} from './cash-account-columns'
import {
  getDrawerSessionColumns,
  drawerSessionColumnConfigs,
  type DrawerSession,
} from './drawer-session-columns'
import {
  getJournalEntryColumns,
  journalEntryColumnConfigs,
  type JournalEntry,
} from './journal-entry-columns'
import {
  getAccountingPeriodColumns,
  accountingPeriodColumnConfigs,
  type AccountingPeriod,
} from './accounting-period-columns'
import { CashSiteHeader } from './cash-site-header'
import { CashAccountsMain } from './cash-accounts-main'
import { DrawerSessionsMain } from './drawer-sessions-main'
import { JournalEntriesMain } from './journal-entries-main'
import { AccountingPeriodsMain } from './accounting-periods-main'
import { AddCashAccountDialog } from './add-cash-account-dialog'
import { EditCashAccountDialog } from './edit-cash-account-dialog'
import { CashAccountTransactionsSheet } from './cash-account-transactions-sheet'
import { AddTransferDialog } from './add-transfer-dialog'
import { DrawerSessionDetailSheet } from './drawer-session-detail-sheet'
import { JournalEntryDetailSheet } from './journal-entry-detail-sheet'
import { AddManualJournalDialog } from './add-manual-journal-dialog'
import { ClosePeriodDialog } from './close-period-dialog'
import { ReopenPeriodDialog } from './reopen-period-dialog'

export function CashMain() {
  const { kitchen, permissions } = useKitchen()
  const queryClient = useQueryClient()
  const [activeTab, setActiveTab] = useState('cash-accounts')

  // Permissions
  const canCreateAccounting = permissions.has('accounting.create')
  const canUpdateAccounting = permissions.has('accounting.update')
  const canDeleteAccounting = permissions.has('accounting.delete')
  const canManualJournal = permissions.has('accounting.journal.manual')
  const canManagePeriod = permissions.has('accounting.period.manage')
  const canTransfer = permissions.has('treasury.create')

  // Account tab state
  const [addAccountOpen, setAddAccountOpen] = useState(false)
  const [transferOpen, setTransferOpen] = useState(false)
  const [editAccount, setEditAccount] = useState<ChartAccount | null>(null)
  const [deleteAccountTarget, setDeleteAccountTarget] = useState<ChartAccount | null>(null)
  const [deleteAccountError, setDeleteAccountError] = useState<string | null>(null)
  const [deletePending, startDeleteTransition] = useTransition()
  const [ledgerAccount, setLedgerAccount] = useState<ChartAccount | null>(null)

  // Drawer session state
  const [detailSession, setDetailSession] = useState<DrawerSession | null>(null)

  // Journal entry state
  const [addJournalOpen, setAddJournalOpen] = useState(false)
  const [detailJournal, setDetailJournal] = useState<JournalEntry | null>(null)

  // Accounting period state
  const [closePeriodTarget, setClosePeriodTarget] = useState<AccountingPeriod | null>(null)
  const [reopenPeriodTarget, setReopenPeriodTarget] = useState<AccountingPeriod | null>(null)

  // ----- Account callbacks -----
  const accountPermissions = useMemo<Permission>(
    () => ({
      canEdit: canUpdateAccounting,
      canDelete: canDeleteAccounting,
    }),
    [canUpdateAccounting, canDeleteAccounting]
  )

  const handleEditAccount = useCallback((row: Row<ChartAccount>) => {
    setEditAccount(row.original)
  }, [])
  const handleDeleteAccount = useCallback((row: Row<ChartAccount>) => {
    setDeleteAccountTarget(row.original)
    setDeleteAccountError(null)
  }, [])
  const handleViewTransactions = useCallback((row: Row<ChartAccount>) => {
    setLedgerAccount(row.original)
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
    search: cashAccountSearch,
    setSearch: setCashAccountSearch,
  } = useServerTable<ChartAccount>({
    queryKey: CHART_ACCOUNTS_QUERY_KEY,
    from: CHART_ACCOUNTS_FROM,
    select: CHART_ACCOUNTS_SELECT,
    columns: cashAccountColumns,
    searchColumn: 'name',
    kitchenId: kitchen.id,
    defaultSort: [{ id: 'code', desc: false }],
  })

  // ----- Drawer sessions -----
  const handleViewDetails = useCallback((row: Row<DrawerSession>) => {
    setDetailSession(row.original)
  }, [])
  const drawerSessionColumns = useMemo(
    () => getDrawerSessionColumns({ onViewDetails: handleViewDetails }),
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

  // ----- Journal entries -----
  const handleViewJournalDetails = useCallback((row: Row<JournalEntry>) => {
    setDetailJournal(row.original)
  }, [])
  const handleReverseJournal = useCallback((row: Row<JournalEntry>) => {
    setDetailJournal(row.original)
  }, [])
  const journalColumns = useMemo(
    () =>
      getJournalEntryColumns({
        onViewDetails: handleViewJournalDetails,
        onReverse: handleReverseJournal,
        canReverse: canManualJournal,
      }),
    [handleViewJournalDetails, handleReverseJournal, canManualJournal]
  )
  const {
    table: journalTable,
    isFetching: journalFetching,
    search: journalSearch,
    setSearch: setJournalSearch,
  } = useServerTable<JournalEntry>({
    queryKey: JOURNAL_ENTRIES_QUERY_KEY,
    from: JOURNAL_ENTRIES_FROM,
    select: JOURNAL_ENTRIES_SELECT,
    columns: journalColumns,
    kitchenId: kitchen.id,
    defaultSort: [{ id: 'entry_date', desc: true }],
  })

  // ----- Accounting periods -----
  const handleClosePeriod = useCallback((row: Row<AccountingPeriod>) => {
    setClosePeriodTarget(row.original)
  }, [])
  const handleReopenPeriod = useCallback((row: Row<AccountingPeriod>) => {
    setReopenPeriodTarget(row.original)
  }, [])
  const periodColumns = useMemo(
    () =>
      getAccountingPeriodColumns({
        onClose: handleClosePeriod,
        onReopen: handleReopenPeriod,
        canManage: canManagePeriod,
      }),
    [handleClosePeriod, handleReopenPeriod, canManagePeriod]
  )
  const {
    table: periodsTable,
    isFetching: periodsFetching,
    search: periodsSearch,
    setSearch: setPeriodsSearch,
  } = useServerTable<AccountingPeriod>({
    queryKey: ACCOUNTING_PERIODS_QUERY_KEY,
    from: ACCOUNTING_PERIODS_FROM,
    select: ACCOUNTING_PERIODS_SELECT,
    columns: periodColumns,
    kitchenId: kitchen.id,
    defaultSort: [{ id: 'start_date', desc: true }],
  })

  // ----- Toolbars -----
  const cashAccountsToolbar: ReactNode = (
    <>
      <ExpandableSearch value={cashAccountSearch} onChange={setCashAccountSearch} />
      <DataTableFilter table={cashAccountTable} columnConfigs={cashAccountColumnConfigs} />
      <DataTableSort table={cashAccountTable} columnConfigs={cashAccountColumnConfigs} />
      {canTransfer && (
        <Button size="sm" variant="outline" onClick={() => setTransferOpen(true)}>
          Transfer
        </Button>
      )}
      {canCreateAccounting && (
        <Button size="sm" onClick={() => setAddAccountOpen(true)}>
          Add Account
        </Button>
      )}
    </>
  )

  const drawerToolbar: ReactNode = (
    <>
      <ExpandableSearch value={drawerSearch} onChange={setDrawerSearch} />
      <DataTableFilter table={drawerSessionTable} columnConfigs={drawerSessionColumnConfigs} />
      <DataTableSort table={drawerSessionTable} columnConfigs={drawerSessionColumnConfigs} />
    </>
  )

  const journalsToolbar: ReactNode = (
    <>
      <ExpandableSearch value={journalSearch} onChange={setJournalSearch} />
      <DataTableFilter table={journalTable} columnConfigs={journalEntryColumnConfigs} />
      <DataTableSort table={journalTable} columnConfigs={journalEntryColumnConfigs} />
      {canManualJournal && (
        <Button size="sm" onClick={() => setAddJournalOpen(true)}>
          New Journal
        </Button>
      )}
    </>
  )

  const periodsToolbar: ReactNode = (
    <>
      <ExpandableSearch value={periodsSearch} onChange={setPeriodsSearch} />
      <DataTableFilter table={periodsTable} columnConfigs={accountingPeriodColumnConfigs} />
      <DataTableSort table={periodsTable} columnConfigs={accountingPeriodColumnConfigs} />
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
          drawerToolbar={drawerToolbar}
          journalsToolbar={journalsToolbar}
          periodsToolbar={periodsToolbar}
        />
        <TabsContent value="cash-accounts" className="mt-0 flex min-h-0 flex-1 flex-col">
          <CashAccountsMain table={cashAccountTable} isFetching={cashAccountsFetching} />
        </TabsContent>
        <TabsContent value="drawer" className="mt-0 flex min-h-0 flex-1 flex-col">
          <DrawerSessionsMain table={drawerSessionTable} isFetching={drawerSessionsFetching} />
        </TabsContent>
        <TabsContent value="journals" className="mt-0 flex min-h-0 flex-1 flex-col">
          <JournalEntriesMain table={journalTable} isFetching={journalFetching} />
        </TabsContent>
        <TabsContent value="periods" className="mt-0 flex min-h-0 flex-1 flex-col">
          <AccountingPeriodsMain table={periodsTable} isFetching={periodsFetching} />
        </TabsContent>
      </Tabs>

      {/* Account dialogs */}
      {canCreateAccounting && (
        <AddCashAccountDialog
          open={addAccountOpen}
          onOpenChange={setAddAccountOpen}
          kitchenId={kitchen.id}
        />
      )}
      {canTransfer && (
        <AddTransferDialog
          open={transferOpen}
          onOpenChange={setTransferOpen}
          kitchenId={kitchen.id}
        />
      )}
      {editAccount && (
        <EditCashAccountDialog
          account={editAccount}
          open
          onOpenChange={(next) => { if (!next) setEditAccount(null) }}
        />
      )}
      {ledgerAccount && (
        <CashAccountTransactionsSheet
          account={ledgerAccount}
          open
          onOpenChange={(next) => { if (!next) setLedgerAccount(null) }}
        />
      )}

      {/* Drawer dialogs */}
      {detailSession && (
        <DrawerSessionDetailSheet
          session={detailSession}
          open
          onOpenChange={(next) => { if (!next) setDetailSession(null) }}
        />
      )}

      {/* Journal dialogs */}
      {canManualJournal && (
        <AddManualJournalDialog open={addJournalOpen} onOpenChange={setAddJournalOpen} />
      )}
      {detailJournal && (
        <JournalEntryDetailSheet
          entry={detailJournal}
          open
          onOpenChange={(next) => { if (!next) setDetailJournal(null) }}
          canReverse={canManualJournal}
          kitchenId={kitchen.id}
        />
      )}

      {/* Account delete dialog */}
      <DataTableDeleteDialog
        open={deleteAccountTarget !== null}
        onOpenChange={(open) => {
          if (!open) {
            setDeleteAccountTarget(null)
            setDeleteAccountError(null)
          }
        }}
        onConfirm={() => {
          if (!deleteAccountTarget) return
          setDeleteAccountError(null)
          startDeleteTransition(async () => {
            const result = await deleteChartAccount(kitchen.id, deleteAccountTarget.id)
            if (result instanceof Error) {
              setDeleteAccountError(
                result.message.includes('journal_entry_lines')
                  ? 'This account has journal entries and cannot be deleted.'
                  : result.message
              )
              return
            }
            setDeleteAccountTarget(null)
            queryClient.invalidateQueries({ queryKey: CHART_ACCOUNTS_QUERY_KEY })
          })
        }}
        isLoading={deletePending}
        description={
          deleteAccountError ??
          'This action cannot be undone. The account will be permanently deleted.'
        }
      />

      {/* Period dialogs */}
      <ClosePeriodDialog
        period={closePeriodTarget}
        open={closePeriodTarget !== null}
        onOpenChange={(next) => { if (!next) setClosePeriodTarget(null) }}
        kitchenId={kitchen.id}
      />
      <ReopenPeriodDialog
        period={reopenPeriodTarget}
        open={reopenPeriodTarget !== null}
        onOpenChange={(next) => { if (!next) setReopenPeriodTarget(null) }}
        kitchenId={kitchen.id}
      />
    </>
  )
}
