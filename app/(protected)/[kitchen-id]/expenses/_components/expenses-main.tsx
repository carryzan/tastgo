'use client'

import { useCallback, useMemo, useState, useTransition, type ReactNode } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import type { Row } from '@tanstack/react-table'
import { useKitchen } from '@/hooks/use-kitchen'
import { useServerTable } from '@/hooks/use-server-table'
import { DataTable } from '@/components/data-table/data-table'
import { DataTableDeleteDialog } from '@/components/data-table/data-table-delete-dialog'
import { DataTableFilter } from '@/components/data-table/data-table-filter'
import { DataTableSort } from '@/components/data-table/data-table-sort'
import { ExpandableSearch } from '@/components/shared/expandable-search'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent } from '@/components/ui/tabs'
import type { Permission } from '@/lib/types/data-table'
import {
  fetchExpenseCategories,
  fetchActiveSettlementAccounts,
  fetchActiveStaffMembers,
} from '../_lib/client-queries'
import { deleteExpenseCategory } from '../_lib/category-actions'
import { deleteExpenseRecurrenceSchedule } from '../_lib/recurrence-actions'
import {
  EXPENSE_RECORDS_QUERY_KEY,
  EXPENSE_RECORDS_FROM,
  EXPENSE_RECORDS_SELECT,
  EXPENSE_CATEGORIES_QUERY_KEY,
  EXPENSE_CATEGORIES_FROM,
  EXPENSE_CATEGORIES_SELECT,
  EXPENSE_RECURRING_QUERY_KEY,
  EXPENSE_RECURRING_FROM,
  EXPENSE_RECURRING_SELECT,
  type ExpenseCategory,
  type ExpenseRecord,
  type ExpenseRecurrenceSchedule,
} from '../_lib/queries'
import {
  getExpenseRecordColumns,
  getExpenseRecordColumnConfigs,
} from './expense-record-columns'
import {
  expenseCategoryColumnConfigs,
  getExpenseCategoryColumns,
} from './expense-category-columns'
import {
  getExpenseRecurringColumnConfigs,
  getExpenseRecurringColumns,
} from './expense-recurring-columns'
import { ExpensesSiteHeader } from './expenses-site-header'
import { ExpenseRecordDialog } from './expense-record-dialog'
import { ReverseExpenseDialog } from './reverse-expense-dialog'
import { ExpenseCategoryDialog } from './expense-category-dialog'
import { ExpenseRecurringDialog } from './expense-recurring-dialog'

export function ExpensesMain() {
  const { kitchen, permissions } = useKitchen()
  const queryClient = useQueryClient()
  const [activeTab, setActiveTab] = useState('records')
  const canCreate = permissions.has('expenses.create')
  const canUpdate = permissions.has('expenses.update')
  const canDelete = permissions.has('expenses.delete')
  const categoryPermissions = useMemo<Permission>(
    () => ({
      canEdit: canUpdate,
      canDelete,
    }),
    [canDelete, canUpdate]
  )

  const { data: categoryOptions = [] } = useQuery({
    queryKey: ['expense-filter-categories', kitchen.id],
    queryFn: () => fetchExpenseCategories(kitchen.id),
  })
  const { data: staffOptions = [] } = useQuery({
    queryKey: ['expense-filter-staff', kitchen.id],
    queryFn: () => fetchActiveStaffMembers(kitchen.id),
  })
  const { data: settlementAccounts = [] } = useQuery({
    queryKey: ['expense-filter-settlement-accounts', kitchen.id],
    queryFn: () => fetchActiveSettlementAccounts(kitchen.id),
  })

  const [recordOpen, setRecordOpen] = useState(false)
  const [recordSchedule, setRecordSchedule] = useState<ExpenseRecurrenceSchedule | null>(null)
  const [reverseTarget, setReverseTarget] = useState<ExpenseRecord | null>(null)

  const [categoryDialogOpen, setCategoryDialogOpen] = useState(false)
  const [editCategory, setEditCategory] = useState<ExpenseCategory | null>(null)
  const [deleteCategoryTarget, setDeleteCategoryTarget] = useState<ExpenseCategory | null>(null)
  const [deleteCategoryError, setDeleteCategoryError] = useState<string | null>(null)
  const [deleteCategoryPending, startDeleteCategoryTransition] = useTransition()

  const [recurringDialogOpen, setRecurringDialogOpen] = useState(false)
  const [editRecurring, setEditRecurring] = useState<ExpenseRecurrenceSchedule | null>(null)
  const [deleteRecurringTarget, setDeleteRecurringTarget] =
    useState<ExpenseRecurrenceSchedule | null>(null)
  const [deleteRecurringError, setDeleteRecurringError] = useState<string | null>(null)
  const [deleteRecurringPending, startDeleteRecurringTransition] = useTransition()

  const handleReverseExpense = useCallback((row: Row<ExpenseRecord>) => {
    setReverseTarget(row.original)
  }, [])

  const recordColumns = useMemo(
    () =>
      getExpenseRecordColumns({
        onReverse: handleReverseExpense,
        canReverse: canUpdate,
      }),
    [canUpdate, handleReverseExpense]
  )

  const recordColumnConfigs = useMemo(
    () =>
      getExpenseRecordColumnConfigs({
        categoryNames: categoryOptions.map((category) => category.name),
        staffNames: staffOptions.map((member) => member.full_name),
        settlementAccountNames: settlementAccounts.map((account) => account.name),
      }),
    [categoryOptions, settlementAccounts, staffOptions]
  )

  const {
    table: recordsTable,
    isFetching: recordsFetching,
    search: recordsSearch,
    setSearch: setRecordsSearch,
  } = useServerTable<ExpenseRecord>({
    queryKey: EXPENSE_RECORDS_QUERY_KEY,
    from: EXPENSE_RECORDS_FROM,
    select: EXPENSE_RECORDS_SELECT,
    columns: recordColumns,
    searchColumn: 'name',
    kitchenId: kitchen.id,
    defaultSort: [{ id: 'expense_date', desc: true }],
  })

  const handleEditCategory = useCallback((row: Row<ExpenseCategory>) => {
    setEditCategory(row.original)
    setCategoryDialogOpen(true)
  }, [])
  const handleDeleteCategory = useCallback((row: Row<ExpenseCategory>) => {
    setDeleteCategoryTarget(row.original)
    setDeleteCategoryError(null)
  }, [])

  const categoryColumns = useMemo(
    () =>
      getExpenseCategoryColumns(categoryPermissions, {
        onEdit: handleEditCategory,
        onDelete: handleDeleteCategory,
      }),
    [categoryPermissions, handleDeleteCategory, handleEditCategory]
  )

  const {
    table: categoriesTable,
    isFetching: categoriesFetching,
    search: categoriesSearch,
    setSearch: setCategoriesSearch,
  } = useServerTable<ExpenseCategory>({
    queryKey: EXPENSE_CATEGORIES_QUERY_KEY,
    from: EXPENSE_CATEGORIES_FROM,
    select: EXPENSE_CATEGORIES_SELECT,
    columns: categoryColumns,
    searchColumn: 'name',
    kitchenId: kitchen.id,
    defaultSort: [{ id: 'name', desc: false }],
  })

  const handleEditRecurring = useCallback((row: Row<ExpenseRecurrenceSchedule>) => {
    setEditRecurring(row.original)
    setRecurringDialogOpen(true)
  }, [])
  const handleDeleteRecurring = useCallback((row: Row<ExpenseRecurrenceSchedule>) => {
    setDeleteRecurringTarget(row.original)
    setDeleteRecurringError(null)
  }, [])
  const handleRecordRecurringExpense = useCallback((row: Row<ExpenseRecurrenceSchedule>) => {
    setRecordSchedule(row.original)
    setRecordOpen(true)
  }, [])

  const recurringColumns = useMemo(
    () =>
      getExpenseRecurringColumns(categoryPermissions, {
        onEdit: handleEditRecurring,
        onDelete: handleDeleteRecurring,
        onRecordExpense: handleRecordRecurringExpense,
        canRecordExpense: canCreate,
      }),
    [
      canCreate,
      categoryPermissions,
      handleDeleteRecurring,
      handleEditRecurring,
      handleRecordRecurringExpense,
    ]
  )

  const recurringColumnConfigs = useMemo(
    () =>
      getExpenseRecurringColumnConfigs({
        categoryNames: categoryOptions.map((category) => category.name),
        settlementAccountNames: settlementAccounts.map((account) => account.name),
      }),
    [categoryOptions, settlementAccounts]
  )

  const {
    table: recurringTable,
    isFetching: recurringFetching,
    search: recurringSearch,
    setSearch: setRecurringSearch,
  } = useServerTable<ExpenseRecurrenceSchedule>({
    queryKey: EXPENSE_RECURRING_QUERY_KEY,
    from: EXPENSE_RECURRING_FROM,
    select: EXPENSE_RECURRING_SELECT,
    columns: recurringColumns,
    searchColumn: 'name',
    kitchenId: kitchen.id,
    defaultSort: [{ id: 'next_due_date', desc: false }],
  })

  const recordsToolbar: ReactNode = (
    <>
      <ExpandableSearch value={recordsSearch} onChange={setRecordsSearch} />
      <DataTableFilter table={recordsTable} columnConfigs={recordColumnConfigs} />
      <DataTableSort table={recordsTable} columnConfigs={recordColumnConfigs} />
      {canCreate ? (
        <Button
          size="sm"
          onClick={() => {
            setRecordSchedule(null)
            setRecordOpen(true)
          }}
        >
          Add Expense
        </Button>
      ) : null}
    </>
  )

  const categoriesToolbar: ReactNode = (
    <>
      <ExpandableSearch value={categoriesSearch} onChange={setCategoriesSearch} />
      <DataTableFilter table={categoriesTable} columnConfigs={expenseCategoryColumnConfigs} />
      <DataTableSort table={categoriesTable} columnConfigs={expenseCategoryColumnConfigs} />
      {canCreate ? (
        <Button
          size="sm"
          onClick={() => {
            setEditCategory(null)
            setCategoryDialogOpen(true)
          }}
        >
          Add Category
        </Button>
      ) : null}
    </>
  )

  const recurringToolbar: ReactNode = (
    <>
      <ExpandableSearch value={recurringSearch} onChange={setRecurringSearch} />
      <DataTableFilter table={recurringTable} columnConfigs={recurringColumnConfigs} />
      <DataTableSort table={recurringTable} columnConfigs={recurringColumnConfigs} />
      {canCreate ? (
        <Button
          size="sm"
          onClick={() => {
            setEditRecurring(null)
            setRecurringDialogOpen(true)
          }}
        >
          Add Schedule
        </Button>
      ) : null}
    </>
  )

  function invalidateCategoryData() {
    queryClient.invalidateQueries({ queryKey: EXPENSE_CATEGORIES_QUERY_KEY })
    queryClient.invalidateQueries({ queryKey: ['expense-filter-categories', kitchen.id] })
    queryClient.invalidateQueries({ queryKey: ['expense-categories-picker', kitchen.id] })
    queryClient.invalidateQueries({ queryKey: ['expense-recurring-categories', kitchen.id] })
  }

  function invalidateRecurringData() {
    queryClient.invalidateQueries({ queryKey: EXPENSE_RECURRING_QUERY_KEY })
    queryClient.invalidateQueries({ queryKey: EXPENSE_RECORDS_QUERY_KEY })
  }

  return (
    <>
      <Tabs
        value={activeTab}
        onValueChange={setActiveTab}
        className="flex min-h-0 flex-1 flex-col gap-0"
      >
        <ExpensesSiteHeader
          activeTab={activeTab}
          recordsToolbar={recordsToolbar}
          categoriesToolbar={categoriesToolbar}
          recurringToolbar={recurringToolbar}
        />

        <TabsContent value="records" className="mt-0 flex min-h-0 flex-1 flex-col">
          <DataTable table={recordsTable} isFetching={recordsFetching} />
        </TabsContent>
        <TabsContent value="categories" className="mt-0 flex min-h-0 flex-1 flex-col">
          <DataTable table={categoriesTable} isFetching={categoriesFetching} />
        </TabsContent>
        <TabsContent value="recurring" className="mt-0 flex min-h-0 flex-1 flex-col">
          <DataTable table={recurringTable} isFetching={recurringFetching} />
        </TabsContent>
      </Tabs>

      {recordOpen ? (
        <ExpenseRecordDialog
          open={recordOpen}
          onOpenChange={(next) => {
            setRecordOpen(next)
            if (!next) setRecordSchedule(null)
          }}
          initialSchedule={recordSchedule}
        />
      ) : null}
      {reverseTarget ? (
        <ReverseExpenseDialog
          kitchenId={kitchen.id}
          expense={reverseTarget}
          open={reverseTarget !== null}
          onOpenChange={(next) => {
            if (!next) setReverseTarget(null)
          }}
        />
      ) : null}
      {categoryDialogOpen ? (
        <ExpenseCategoryDialog
          open={categoryDialogOpen}
          onOpenChange={(next) => {
            setCategoryDialogOpen(next)
            if (!next) {
              setEditCategory(null)
              invalidateCategoryData()
            }
          }}
          category={editCategory}
        />
      ) : null}
      {recurringDialogOpen ? (
        <ExpenseRecurringDialog
          open={recurringDialogOpen}
          onOpenChange={(next) => {
            setRecurringDialogOpen(next)
            if (!next) {
              setEditRecurring(null)
              invalidateRecurringData()
            }
          }}
          schedule={editRecurring}
        />
      ) : null}

      <DataTableDeleteDialog
        open={deleteCategoryTarget !== null}
        onOpenChange={(open) => {
          if (!open) {
            setDeleteCategoryTarget(null)
            setDeleteCategoryError(null)
          }
        }}
        description={
          deleteCategoryError
            ? `Delete this category only if it is no longer referenced by expenses or recurring schedules. ${deleteCategoryError}`
            : 'Delete this category only if it is no longer referenced by expenses or recurring schedules.'
        }
        onConfirm={() => {
          if (!deleteCategoryTarget) return

          startDeleteCategoryTransition(async () => {
            const result = await deleteExpenseCategory(kitchen.id, deleteCategoryTarget.id)
            if (result instanceof Error) {
              setDeleteCategoryError(result.message)
              return
            }

            invalidateCategoryData()
            setDeleteCategoryTarget(null)
            setDeleteCategoryError(null)
          })
        }}
        isLoading={deleteCategoryPending}
      />

      <DataTableDeleteDialog
        open={deleteRecurringTarget !== null}
        onOpenChange={(open) => {
          if (!open) {
            setDeleteRecurringTarget(null)
            setDeleteRecurringError(null)
          }
        }}
        description={
          deleteRecurringError
            ? `Delete this recurring schedule only if you no longer need to record expenses from it. ${deleteRecurringError}`
            : 'Delete this recurring schedule only if you no longer need to record expenses from it.'
        }
        onConfirm={() => {
          if (!deleteRecurringTarget) return

          startDeleteRecurringTransition(async () => {
            const result = await deleteExpenseRecurrenceSchedule(
              kitchen.id,
              deleteRecurringTarget.id
            )
            if (result instanceof Error) {
              setDeleteRecurringError(result.message)
              return
            }

            invalidateRecurringData()
            setDeleteRecurringTarget(null)
            setDeleteRecurringError(null)
          })
        }}
        isLoading={deleteRecurringPending}
      />
    </>
  )
}
