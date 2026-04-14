'use client'

import { useCallback, useMemo, useState, useTransition, type ReactNode } from 'react'
import type { Row } from '@tanstack/react-table'
import { useKitchen } from '@/hooks/use-kitchen'
import { useServerTable } from '@/hooks/use-server-table'
import { useQueryClient } from '@tanstack/react-query'
import { DataTableDeleteDialog } from '@/components/data-table/data-table-delete-dialog'
import { DataTableFilter } from '@/components/data-table/data-table-filter'
import { DataTableSort } from '@/components/data-table/data-table-sort'
import { ExpandableSearch } from '@/components/shared/expandable-search'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent } from '@/components/ui/tabs'
import type { Permission } from '@/lib/types/data-table'
import { markPurchaseSent } from '../_lib/purchase-actions'
import {
  SUPPLIERS_QUERY_KEY,
  SUPPLIERS_FROM,
  SUPPLIERS_SELECT,
  PURCHASES_QUERY_KEY,
  PURCHASES_FROM,
  PURCHASES_SELECT,
  PAYMENTS_QUERY_KEY,
  PAYMENTS_FROM,
  PAYMENTS_SELECT,
  RETURNS_QUERY_KEY,
  RETURNS_FROM,
  RETURNS_SELECT,
  CREDIT_NOTES_QUERY_KEY,
  CREDIT_NOTES_FROM,
  CREDIT_NOTES_SELECT,
} from '../_lib/queries'
import {
  getSupplierColumns,
  supplierColumnConfigs,
  type Supplier,
} from './supplier-columns'
import {
  getPurchaseColumns,
  purchaseColumnConfigs,
  type Purchase,
} from './purchase-columns'
import {
  getPaymentColumns,
  paymentColumnConfigs,
  type SupplierPayment,
} from './payment-columns'
import {
  getReturnColumns,
  returnColumnConfigs,
  type SupplierReturn,
} from './return-columns'
import {
  getCreditNoteColumns,
  creditNoteColumnConfigs,
  type SupplierCreditNote,
} from './credit-note-columns'
import { ProcurementSiteHeader } from './procurement-site-header'
import { SuppliersMain } from './suppliers-main'
import { PurchasesMain } from './purchases-main'
import { PaymentsMain } from './payments-main'
import { ReturnsMain } from './returns-main'
import { CreditNotesMain } from './credit-notes-main'
import { AddSupplierSheet } from './add-supplier-sheet'
import { EditSupplierSheet } from './edit-supplier-sheet'
import { SupplierPriceHistorySheet } from './supplier-price-history-sheet'
import { AddPurchaseSheet } from './add-purchase-sheet'
import { EditPurchaseSheet } from './edit-purchase-sheet'
import { ReceivePurchaseSheet } from './receive-purchase-sheet'
import { PurchasePaymentsSheet } from './purchase-payments-sheet'
import { AddReturnSheet } from './add-return-sheet'
import { ReturnDetailSheet } from './return-detail-sheet'
import { ApplyCreditNoteDialog } from './apply-credit-note-dialog'

export function ProcurementMain() {
  const { kitchen } = useKitchen()
  const queryClient = useQueryClient()
  const [, startMarkSentTransition] = useTransition()
  const [activeTab, setActiveTab] = useState('suppliers')

  // Supplier state
  const [addSupplierOpen, setAddSupplierOpen] = useState(false)
  const [editSupplier, setEditSupplier] = useState<Supplier | null>(null)
  const [deleteSupplierTarget, setDeleteSupplierTarget] = useState<Supplier | null>(null)
  const [priceHistorySupplier, setPriceHistorySupplier] = useState<Supplier | null>(null)

  // Purchase state
  const [addPurchaseOpen, setAddPurchaseOpen] = useState(false)
  const [editPurchase, setEditPurchase] = useState<Purchase | null>(null)
  const [receivePurchase, setReceivePurchase] = useState<Purchase | null>(null)
  const [paymentsPurchase, setPaymentsPurchase] = useState<Purchase | null>(null)
  const [returnPurchase, setReturnPurchase] = useState<Purchase | null>(null)

  // Return state
  const [addReturnOpen, setAddReturnOpen] = useState(false)
  const [detailReturn, setDetailReturn] = useState<SupplierReturn | null>(null)

  // Credit note state
  const [applyCreditNote, setApplyCreditNote] = useState<SupplierCreditNote | null>(null)

  const supplierPermissions = useMemo<Permission>(
    () => ({ canEdit: true, canDelete: true }),
    []
  )

  // Supplier callbacks
  const handleEditSupplier = useCallback((row: Row<Supplier>) => {
    setEditSupplier(row.original)
  }, [])
  const handleDeleteSupplier = useCallback((row: Row<Supplier>) => {
    setDeleteSupplierTarget(row.original)
  }, [])
  const handlePriceHistory = useCallback((row: Row<Supplier>) => {
    setPriceHistorySupplier(row.original)
  }, [])

  const supplierColumns = useMemo(
    () =>
      getSupplierColumns(supplierPermissions, {
        onEdit: handleEditSupplier,
        onDelete: handleDeleteSupplier,
        onPriceHistory: handlePriceHistory,
      }),
    [supplierPermissions, handleEditSupplier, handleDeleteSupplier, handlePriceHistory]
  )

  const {
    table: supplierTable,
    isFetching: suppliersFetching,
    deleteMutation: supplierDeleteMutation,
    search: supplierSearch,
    setSearch: setSupplierSearch,
  } = useServerTable<Supplier>({
    queryKey: SUPPLIERS_QUERY_KEY,
    from: SUPPLIERS_FROM,
    select: SUPPLIERS_SELECT,
    columns: supplierColumns,
    searchColumn: 'name',
    kitchenId: kitchen.id,
  })

  // Purchase callbacks
  const handleEditPurchase = useCallback((row: Row<Purchase>) => {
    setEditPurchase(row.original)
  }, [])
  const handleMarkSent = useCallback((row: Row<Purchase>) => {
    startMarkSentTransition(async () => {
      await markPurchaseSent(kitchen.id, row.original.id)
      queryClient.invalidateQueries({ queryKey: PURCHASES_QUERY_KEY })
    })
  }, [kitchen.id, queryClient])
  const handleReceive = useCallback((row: Row<Purchase>) => {
    setReceivePurchase(row.original)
  }, [])
  const handlePayments = useCallback((row: Row<Purchase>) => {
    setPaymentsPurchase(row.original)
  }, [])
  const handleCreateReturn = useCallback((row: Row<Purchase>) => {
    setReturnPurchase(row.original)
  }, [])

  const purchaseColumns = useMemo(
    () =>
      getPurchaseColumns(supplierPermissions, {
        onEdit: handleEditPurchase,
        onMarkSent: handleMarkSent,
        onReceive: handleReceive,
        onPayments: handlePayments,
        onCreateReturn: handleCreateReturn,
      }),
    [supplierPermissions, handleEditPurchase, handleMarkSent, handleReceive, handlePayments, handleCreateReturn]
  )

  const {
    table: purchaseTable,
    isFetching: purchasesFetching,
    search: purchaseSearch,
    setSearch: setPurchaseSearch,
  } = useServerTable<Purchase>({
    queryKey: PURCHASES_QUERY_KEY,
    from: PURCHASES_FROM,
    select: PURCHASES_SELECT,
    columns: purchaseColumns,
    kitchenId: kitchen.id,
  })

  // Payment columns (read-only)
  const paymentColumns = useMemo(() => getPaymentColumns(), [])

  const {
    table: paymentTable,
    isFetching: paymentsFetching,
    search: paymentSearch,
    setSearch: setPaymentSearch,
  } = useServerTable<SupplierPayment>({
    queryKey: PAYMENTS_QUERY_KEY,
    from: PAYMENTS_FROM,
    select: PAYMENTS_SELECT,
    columns: paymentColumns,
    kitchenId: kitchen.id,
  })

  // Return callbacks
  const handleViewDetail = useCallback((row: Row<SupplierReturn>) => {
    setDetailReturn(row.original)
  }, [])

  const returnColumns = useMemo(
    () =>
      getReturnColumns(supplierPermissions, {
        onViewDetail: handleViewDetail,
      }),
    [supplierPermissions, handleViewDetail]
  )

  const {
    table: returnTable,
    isFetching: returnsFetching,
    search: returnSearch,
    setSearch: setReturnSearch,
  } = useServerTable<SupplierReturn>({
    queryKey: RETURNS_QUERY_KEY,
    from: RETURNS_FROM,
    select: RETURNS_SELECT,
    columns: returnColumns,
    kitchenId: kitchen.id,
  })

  // Credit note callbacks
  const handleApplyCreditNote = useCallback((row: Row<SupplierCreditNote>) => {
    setApplyCreditNote(row.original)
  }, [])

  const creditNoteColumns = useMemo(
    () =>
      getCreditNoteColumns({
        onApply: handleApplyCreditNote,
      }),
    [handleApplyCreditNote]
  )

  const {
    table: creditNoteTable,
    isFetching: creditNotesFetching,
    search: creditNoteSearch,
    setSearch: setCreditNoteSearch,
  } = useServerTable<SupplierCreditNote>({
    queryKey: CREDIT_NOTES_QUERY_KEY,
    from: CREDIT_NOTES_FROM,
    select: CREDIT_NOTES_SELECT,
    columns: creditNoteColumns,
    kitchenId: kitchen.id,
  })

  // Toolbars
  const suppliersToolbar: ReactNode = (
    <>
      <ExpandableSearch value={supplierSearch} onChange={setSupplierSearch} />
      <DataTableFilter table={supplierTable} columnConfigs={supplierColumnConfigs} />
      <DataTableSort table={supplierTable} columnConfigs={supplierColumnConfigs} />
      <Button size="sm" onClick={() => setAddSupplierOpen(true)}>
        Add Supplier
      </Button>
    </>
  )

  const purchasesToolbar: ReactNode = (
    <>
      <ExpandableSearch value={purchaseSearch} onChange={setPurchaseSearch} />
      <DataTableFilter table={purchaseTable} columnConfigs={purchaseColumnConfigs} />
      <DataTableSort table={purchaseTable} columnConfigs={purchaseColumnConfigs} />
      <Button size="sm" onClick={() => setAddPurchaseOpen(true)}>
        Add Purchase
      </Button>
    </>
  )

  const paymentsToolbar: ReactNode = (
    <>
      <ExpandableSearch value={paymentSearch} onChange={setPaymentSearch} />
      <DataTableFilter table={paymentTable} columnConfigs={paymentColumnConfigs} />
      <DataTableSort table={paymentTable} columnConfigs={paymentColumnConfigs} />
    </>
  )

  const returnsToolbar: ReactNode = (
    <>
      <ExpandableSearch value={returnSearch} onChange={setReturnSearch} />
      <DataTableFilter table={returnTable} columnConfigs={returnColumnConfigs} />
      <DataTableSort table={returnTable} columnConfigs={returnColumnConfigs} />
      <Button size="sm" onClick={() => setAddReturnOpen(true)}>
        Add Return
      </Button>
    </>
  )

  const creditNotesToolbar: ReactNode = (
    <>
      <ExpandableSearch value={creditNoteSearch} onChange={setCreditNoteSearch} />
      <DataTableFilter table={creditNoteTable} columnConfigs={creditNoteColumnConfigs} />
      <DataTableSort table={creditNoteTable} columnConfigs={creditNoteColumnConfigs} />
    </>
  )

  return (
    <>
      <Tabs
        value={activeTab}
        onValueChange={setActiveTab}
        className="flex min-h-0 flex-1 flex-col gap-0"
      >
        <ProcurementSiteHeader
          activeTab={activeTab}
          suppliersToolbar={suppliersToolbar}
          purchasesToolbar={purchasesToolbar}
          paymentsToolbar={paymentsToolbar}
          returnsToolbar={returnsToolbar}
          creditNotesToolbar={creditNotesToolbar}
        />
        <TabsContent value="suppliers" className="mt-0 flex min-h-0 flex-1 flex-col">
          <SuppliersMain table={supplierTable} isFetching={suppliersFetching} />
        </TabsContent>
        <TabsContent value="purchases" className="mt-0 flex min-h-0 flex-1 flex-col">
          <PurchasesMain table={purchaseTable} isFetching={purchasesFetching} />
        </TabsContent>
        <TabsContent value="payments" className="mt-0 flex min-h-0 flex-1 flex-col">
          <PaymentsMain table={paymentTable} isFetching={paymentsFetching} />
        </TabsContent>
        <TabsContent value="returns" className="mt-0 flex min-h-0 flex-1 flex-col">
          <ReturnsMain table={returnTable} isFetching={returnsFetching} />
        </TabsContent>
        <TabsContent value="credit-notes" className="mt-0 flex min-h-0 flex-1 flex-col">
          <CreditNotesMain table={creditNoteTable} isFetching={creditNotesFetching} />
        </TabsContent>
      </Tabs>

      {/* Supplier sheets */}
      <AddSupplierSheet
        open={addSupplierOpen}
        onOpenChange={setAddSupplierOpen}
      />
      {editSupplier && (
        <EditSupplierSheet
          supplier={editSupplier}
          open
          onOpenChange={(next) => {
            if (!next) setEditSupplier(null)
          }}
        />
      )}
      {priceHistorySupplier && (
        <SupplierPriceHistorySheet
          supplier={priceHistorySupplier}
          open
          onOpenChange={(next) => {
            if (!next) setPriceHistorySupplier(null)
          }}
        />
      )}
      <DataTableDeleteDialog
        open={deleteSupplierTarget !== null}
        onOpenChange={(open) => {
          if (!open) setDeleteSupplierTarget(null)
        }}
        onConfirm={() => {
          if (deleteSupplierTarget) {
            supplierDeleteMutation.mutate(deleteSupplierTarget, {
              onSuccess: () => setDeleteSupplierTarget(null),
            })
          }
        }}
        isLoading={supplierDeleteMutation.isPending}
      />

      {/* Purchase sheets */}
      <AddPurchaseSheet
        open={addPurchaseOpen}
        onOpenChange={setAddPurchaseOpen}
      />
      {editPurchase && editPurchase.status === 'draft' && (
        <EditPurchaseSheet
          purchase={editPurchase}
          open
          onOpenChange={(next) => {
            if (!next) setEditPurchase(null)
          }}
        />
      )}
      {receivePurchase && (
        <ReceivePurchaseSheet
          purchase={receivePurchase}
          open
          onOpenChange={(next) => {
            if (!next) setReceivePurchase(null)
          }}
        />
      )}
      {paymentsPurchase && (
        <PurchasePaymentsSheet
          purchase={paymentsPurchase}
          open
          onOpenChange={(next) => {
            if (!next) setPaymentsPurchase(null)
          }}
        />
      )}

      {/* Return sheet — pre-filled from a purchase */}
      {returnPurchase && (
        <AddReturnSheet
          open
          onOpenChange={(next) => {
            if (!next) setReturnPurchase(null)
          }}
          prefilledPurchaseId={returnPurchase.id}
          prefilledSupplierId={returnPurchase.supplier_id}
        />
      )}
      <AddReturnSheet
        open={addReturnOpen}
        onOpenChange={setAddReturnOpen}
      />
      {detailReturn && (
        <ReturnDetailSheet
          supplierReturn={detailReturn}
          open
          onOpenChange={(next) => {
            if (!next) setDetailReturn(null)
          }}
        />
      )}

      {/* Credit note dialog */}
      {applyCreditNote && (
        <ApplyCreditNoteDialog
          creditNote={applyCreditNote}
          open
          onOpenChange={(next) => {
            if (!next) setApplyCreditNote(null)
          }}
        />
      )}
    </>
  )
}
