'use client'

import { useEffect, useMemo, startTransition as deferStateUpdate, useState, useTransition } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useKitchen } from '@/hooks/use-kitchen'
import { createSupplierReturn } from '../_lib/return-actions'
import { RETURNS_QUERY_KEY } from '../_lib/queries'
import {
  fetchActiveSuppliers,
  fetchReceivedPurchasesForSupplier,
  fetchPurchaseItems,
} from '../_lib/client-queries'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Spinner } from '@/components/ui/spinner'
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Field,
  FieldError,
  FieldGroup,
  FieldLabel,
} from '@/components/ui/field'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/data-table/data-table-primitives'

interface ReturnLineItem {
  purchase_item_id: string
  inventory_item_id: string
  batch_id: string
  inventory_item_name: string
  received_quantity: string | number
  returned_quantity: string
}

interface AddReturnSheetProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  prefilledPurchaseId?: string
  prefilledSupplierId?: string
}

export function AddReturnSheet({
  open,
  onOpenChange,
  prefilledPurchaseId,
  prefilledSupplierId,
}: AddReturnSheetProps) {
  const { kitchen } = useKitchen()
  const queryClient = useQueryClient()

  const [supplierId, setSupplierId] = useState(prefilledSupplierId ?? '')
  const [purchaseId, setPurchaseId] = useState(prefilledPurchaseId ?? '')
  const [returnItems, setReturnItems] = useState<ReturnLineItem[]>([])
  const [error, setError] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()

  const { data: suppliers } = useQuery({
    queryKey: ['active-suppliers', kitchen.id],
    queryFn: () => fetchActiveSuppliers(kitchen.id),
    enabled: open && !prefilledSupplierId,
  })

  const { data: receivedPurchases } = useQuery({
    queryKey: ['received-purchases', kitchen.id, supplierId],
    queryFn: () => fetchReceivedPurchasesForSupplier(kitchen.id, supplierId),
    enabled: open && !!supplierId,
  })

  const { data: purchaseItemsData, isLoading: itemsLoading } = useQuery({
    queryKey: ['purchase-items', purchaseId],
    queryFn: () => fetchPurchaseItems(purchaseId),
    enabled: open && !!purchaseId,
  })

  useEffect(() => {
    deferStateUpdate(() => {
      if (purchaseItemsData) {
        setReturnItems(
          purchaseItemsData
            .filter((item) => item.batch_id)
            .map((item) => ({
              purchase_item_id: item.id,
              inventory_item_id: item.inventory_item_id,
              batch_id: item.batch_id ?? '',
              inventory_item_name: item.inventory_items?.name ?? '—',
              received_quantity: item.received_quantity ?? item.ordered_quantity,
              returned_quantity: '',
            }))
        )
      } else {
        setReturnItems([])
      }
    })
  }, [purchaseItemsData])

  function handleOpenChange(next: boolean) {
    if (pending) return
    if (!next) {
      if (!prefilledSupplierId) setSupplierId('')
      if (!prefilledPurchaseId) setPurchaseId('')
      setReturnItems([])
      setError(null)
    }
    onOpenChange(next)
  }

  function updateReturnQty(index: number, value: string) {
    setReturnItems((prev) =>
      prev.map((item, i) =>
        i === index ? { ...item, returned_quantity: value } : item
      )
    )
  }

  const activeReturnItems = useMemo(
    () => returnItems.filter((item) => item.returned_quantity !== ''),
    [returnItems]
  )

  function handleSave() {
    setError(null)

    if (!supplierId) return setError('Select a supplier.')
    if (!purchaseId) return setError('Select a purchase.')
    if (activeReturnItems.length === 0)
      return setError('Enter a return quantity for at least one item.')

    for (const item of activeReturnItems) {
      const qty = Number(item.returned_quantity)
      if (Number.isNaN(qty) || qty <= 0)
        return setError('Return quantities must be greater than 0.')
      if (qty > Number(item.received_quantity))
        return setError(
          `Return quantity for ${item.inventory_item_name} exceeds received quantity.`
        )
      if (!item.batch_id)
        return setError(`Item ${item.inventory_item_name} has no batch associated.`)
    }

    startTransition(async () => {
      try {
        const result = await createSupplierReturn({
          kitchen_id: kitchen.id,
          purchase_id: purchaseId,
          supplier_id: supplierId,
          items: activeReturnItems.map((item) => ({
            inventory_item_id: item.inventory_item_id,
            batch_id: item.batch_id,
            returned_quantity: Number(item.returned_quantity),
          })),
        })
        if (result instanceof Error) return setError(result.message)
        onOpenChange(false)
        queryClient.invalidateQueries({ queryKey: RETURNS_QUERY_KEY })
      } catch {
        setError('Something went wrong. Please try again.')
      }
    })
  }

  const hasTable = !!purchaseId

  return (
    <Sheet open={open} onOpenChange={handleOpenChange}>
      <SheetContent
        className="flex flex-col gap-0 p-0 sm:max-w-xl"
        showCloseButton={!pending}
        onInteractOutside={(e) => {
          if (pending) e.preventDefault()
        }}
        onEscapeKeyDown={(e) => {
          if (pending) e.preventDefault()
        }}
      >
        <SheetHeader className="border-b px-4 py-4">
          <SheetTitle>Add return</SheetTitle>
          <SheetDescription>
            Return items from a received purchase to a supplier.
          </SheetDescription>
        </SheetHeader>

        <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
          {/* Top fields */}
          {(!prefilledSupplierId || !prefilledPurchaseId) && (
            <div className="shrink-0 px-4 py-4">
              <FieldGroup>
                {!prefilledSupplierId && (
                  <Field>
                    <FieldLabel>Supplier</FieldLabel>
                    <Select
                      value={supplierId}
                      onValueChange={(v) => {
                        setSupplierId(v)
                        setPurchaseId('')
                      }}
                      disabled={pending}
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Select supplier" />
                      </SelectTrigger>
                      <SelectContent>
                        {(suppliers ?? []).map((s) => (
                          <SelectItem key={s.id} value={s.id}>
                            {s.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </Field>
                )}
                {supplierId && !prefilledPurchaseId && (
                  <Field>
                    <FieldLabel>Purchase</FieldLabel>
                    <Select value={purchaseId} onValueChange={setPurchaseId} disabled={pending}>
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Select received purchase" />
                      </SelectTrigger>
                      <SelectContent>
                        {(receivedPurchases ?? []).map((p) => (
                          <SelectItem key={p.id} value={p.id}>
                            #{p.purchase_number}
                            {p.supplier_invoice_code ? ` — ${p.supplier_invoice_code}` : ''}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </Field>
                )}
              </FieldGroup>
            </div>
          )}

          {/* Items header */}
          {hasTable && (
            <div className="flex shrink-0 items-center justify-between border-t px-4 py-2">
              <h3 className="text-sm font-medium">Items to return</h3>
              <p className="text-xs text-muted-foreground">Leave blank to skip</p>
            </div>
          )}

          {/* Scrollable table or spacer */}
          {hasTable ? (
            <div className="flex-1 overflow-y-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="pl-4">Item</TableHead>
                    <TableHead className="w-28">Received</TableHead>
                    <TableHead className="w-32">Return qty</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {itemsLoading ? (
                    <TableRow>
                      <TableCell colSpan={3} className="px-4 py-3">
                        <Skeleton className="h-8 w-full rounded-lg" />
                      </TableCell>
                    </TableRow>
                  ) : returnItems.length === 0 ? (
                    <TableRow>
                      <TableCell
                        colSpan={3}
                        className="h-24 text-center text-muted-foreground"
                      >
                        No received items found for this purchase.
                      </TableCell>
                    </TableRow>
                  ) : (
                    returnItems.map((item, index) => (
                      <TableRow key={item.purchase_item_id}>
                        <TableCell className="pl-4 font-medium">
                          {item.inventory_item_name}
                        </TableCell>
                        <TableCell className="tabular-nums text-muted-foreground">
                          {Number(item.received_quantity).toLocaleString()}
                        </TableCell>
                        <TableCell className="pr-4">
                          <Input
                            type="number"
                            inputMode="decimal"
                            min="0"
                            step="0.0001"
                            value={item.returned_quantity}
                            onChange={(e) => updateReturnQty(index, e.target.value)}
                            disabled={pending}
                            placeholder="—"
                          />
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          ) : (
            <div className="flex-1" />
          )}
        </div>

        <div className="border-t" />

        {error && (
          <div className="px-4 pt-3">
            <FieldError>{error}</FieldError>
          </div>
        )}

        <SheetFooter>
          <Button
            type="button"
            onClick={handleSave}
            disabled={pending || !purchaseId}
            className="min-w-28"
          >
            {pending && <Spinner data-icon="inline-start" />}
            Create return
          </Button>
          <SheetClose asChild>
            <Button variant="outline" type="button" disabled={pending}>
              Cancel
            </Button>
          </SheetClose>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  )
}
