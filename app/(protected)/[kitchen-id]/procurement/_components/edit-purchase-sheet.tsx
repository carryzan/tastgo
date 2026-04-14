'use client'

import { useCallback, useEffect, useMemo, useState, useTransition } from 'react'
import { PlusIcon, TrashIcon } from 'lucide-react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useKitchen } from '@/hooks/use-kitchen'
import { updatePurchase, replacePurchaseItems } from '../_lib/purchase-actions'
import { PURCHASES_QUERY_KEY } from '../_lib/queries'
import {
  fetchActiveInventoryItems,
  fetchPurchaseItems,
  fetchActiveSuppliers,
} from '../_lib/client-queries'
import type { Purchase } from './purchase-columns'
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

interface LineItem {
  inventory_item_id: string
  ordered_quantity: string
  unit_cost: string
}

interface EditPurchaseSheetProps {
  purchase: Purchase
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function EditPurchaseSheet({
  purchase,
  open,
  onOpenChange,
}: EditPurchaseSheetProps) {
  const { kitchen } = useKitchen()
  const queryClient = useQueryClient()
  const [supplierId, setSupplierId] = useState(purchase.supplier_id)
  const [invoiceCode, setInvoiceCode] = useState(purchase.supplier_invoice_code ?? '')
  const [items, setItems] = useState<LineItem[]>([])
  const [error, setError] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()

  const { data: suppliers } = useQuery({
    queryKey: ['active-suppliers', kitchen.id],
    queryFn: () => fetchActiveSuppliers(kitchen.id),
    enabled: open,
  })

  const { data: inventoryItems } = useQuery({
    queryKey: ['active-inventory-items', kitchen.id],
    queryFn: () => fetchActiveInventoryItems(kitchen.id),
    enabled: open,
  })

  const { data: existingItems, isLoading: itemsLoading } = useQuery({
    queryKey: ['purchase-items', purchase.id],
    queryFn: () => fetchPurchaseItems(purchase.id),
    enabled: open,
  })

  useEffect(() => {
    if (!open) {
      setSupplierId(purchase.supplier_id)
      setInvoiceCode(purchase.supplier_invoice_code ?? '')
      setItems([])
      setError(null)
    }
  }, [open, purchase.id, purchase.supplier_id, purchase.supplier_invoice_code])

  useEffect(() => {
    if (existingItems) {
      setItems(
        existingItems.map((item) => ({
          inventory_item_id: item.inventory_item_id,
          ordered_quantity: String(item.ordered_quantity),
          unit_cost: String(item.unit_cost),
        }))
      )
    }
  }, [existingItems])

  function handleOpenChange(next: boolean) {
    if (pending) return
    onOpenChange(next)
  }

  function addItem() {
    setItems((prev) => [
      ...prev,
      { inventory_item_id: '', ordered_quantity: '', unit_cost: '' },
    ])
  }

  function updateItem(index: number, patch: Partial<LineItem>) {
    setItems((prev) =>
      prev.map((item, i) => (i === index ? { ...item, ...patch } : item))
    )
  }

  function removeItem(index: number) {
    setItems((prev) => prev.filter((_, i) => i !== index))
  }

  const usedItemIds = useMemo(
    () => new Set(items.map((i) => i.inventory_item_id).filter(Boolean)),
    [items]
  )

  const availableItemsForRow = useCallback(
    (rowIndex: number) => {
      const rowItemId = items[rowIndex]?.inventory_item_id
      return (inventoryItems ?? []).filter(
        (item) => !usedItemIds.has(item.id) || item.id === rowItemId
      )
    },
    [inventoryItems, items, usedItemIds]
  )

  function handleSave() {
    setError(null)

    if (!supplierId) return setError('Select a supplier.')
    if (items.length === 0) return setError('Add at least one item.')

    for (const item of items) {
      if (!item.inventory_item_id) return setError('Select an item for each row.')
      if (!item.ordered_quantity || Number(item.ordered_quantity) <= 0)
        return setError('Enter a valid quantity for each item.')
      if (!item.unit_cost || Number(item.unit_cost) < 0)
        return setError('Enter a valid unit cost for each item.')
    }

    startTransition(async () => {
      try {
        const [updateResult, itemsResult] = await Promise.all([
          updatePurchase(kitchen.id, purchase.id, {
            supplier_id: supplierId,
            supplier_invoice_code: invoiceCode.trim() || null,
          }),
          replacePurchaseItems(
            kitchen.id,
            purchase.id,
            items.map((item) => ({
              inventory_item_id: item.inventory_item_id,
              ordered_quantity: Number(item.ordered_quantity),
              unit_cost: Number(item.unit_cost),
            }))
          ),
        ])
        if (updateResult instanceof Error) return setError(updateResult.message)
        if (itemsResult instanceof Error) return setError(itemsResult.message)
        onOpenChange(false)
        queryClient.invalidateQueries({ queryKey: PURCHASES_QUERY_KEY })
        queryClient.invalidateQueries({ queryKey: ['purchase-items', purchase.id] })
      } catch {
        setError('Something went wrong. Please try again.')
      }
    })
  }

  const computeLineTotal = (qty: string, cost: string) => {
    const q = Number(qty)
    const c = Number(cost)
    if (!qty || !cost || Number.isNaN(q) || Number.isNaN(c)) return '—'
    return (q * c).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
  }

  return (
    <Sheet open={open} onOpenChange={handleOpenChange}>
      <SheetContent
        className="flex flex-col gap-0 p-0 sm:max-w-2xl"
        showCloseButton={!pending}
        onInteractOutside={(e) => {
          if (pending) e.preventDefault()
        }}
        onEscapeKeyDown={(e) => {
          if (pending) e.preventDefault()
        }}
      >
        <SheetHeader className="border-b px-4 py-4">
          <SheetTitle>Edit purchase #{purchase.purchase_number}</SheetTitle>
          <SheetDescription>Update this draft purchase order.</SheetDescription>
        </SheetHeader>

        <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
          {/* Top fields */}
          <div className="shrink-0 px-4 py-4">
            <FieldGroup>
              <Field>
                <FieldLabel>Supplier</FieldLabel>
                <Select value={supplierId} onValueChange={setSupplierId} disabled={pending}>
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
              <Field>
                <FieldLabel htmlFor="edit-po-invoice">Invoice code</FieldLabel>
                <Input
                  id="edit-po-invoice"
                  value={invoiceCode}
                  onChange={(e) => setInvoiceCode(e.target.value)}
                  placeholder="Optional"
                  disabled={pending}
                />
              </Field>
            </FieldGroup>
          </div>

          {/* Items header */}
          <div className="flex shrink-0 items-center justify-between border-t px-4 py-2">
            <h3 className="text-sm font-medium">Items</h3>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={addItem}
              disabled={pending || itemsLoading}
            >
              <PlusIcon />
              Add item
            </Button>
          </div>

          {/* Scrollable table */}
          <div className="flex-1 overflow-y-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="pl-4">Item</TableHead>
                  <TableHead className="w-28">Qty</TableHead>
                  <TableHead className="w-28">Unit cost</TableHead>
                  <TableHead className="w-24">Total</TableHead>
                  <TableHead className="w-10" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {itemsLoading ? (
                  <TableRow>
                    <TableCell colSpan={5} className="px-4 py-3">
                      <Skeleton className="h-8 w-full rounded-lg" />
                    </TableCell>
                  </TableRow>
                ) : items.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={5}
                      className="h-32 text-center text-muted-foreground"
                    >
                      No items yet. Click &ldquo;Add item&rdquo; to begin.
                    </TableCell>
                  </TableRow>
                ) : (
                  items.map((item, index) => {
                    const available = availableItemsForRow(index)
                    return (
                      <TableRow key={index}>
                        <TableCell className="pl-4">
                          <Select
                            value={item.inventory_item_id || undefined}
                            onValueChange={(v) =>
                              updateItem(index, { inventory_item_id: v })
                            }
                            disabled={pending}
                          >
                            <SelectTrigger className="w-full">
                              <SelectValue placeholder="Select item" />
                            </SelectTrigger>
                            <SelectContent>
                              {available.map((inv) => (
                                <SelectItem key={inv.id} value={inv.id}>
                                  {inv.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </TableCell>
                        <TableCell>
                          <Input
                            type="number"
                            inputMode="decimal"
                            min="0.0001"
                            step="0.0001"
                            value={item.ordered_quantity}
                            onChange={(e) =>
                              updateItem(index, { ordered_quantity: e.target.value })
                            }
                            disabled={pending}
                            placeholder="0"
                          />
                        </TableCell>
                        <TableCell>
                          <Input
                            type="number"
                            inputMode="decimal"
                            min="0"
                            step="0.000001"
                            value={item.unit_cost}
                            onChange={(e) =>
                              updateItem(index, { unit_cost: e.target.value })
                            }
                            disabled={pending}
                            placeholder="0.00"
                          />
                        </TableCell>
                        <TableCell className="tabular-nums text-muted-foreground">
                          {computeLineTotal(item.ordered_quantity, item.unit_cost)}
                        </TableCell>
                        <TableCell>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="size-8 text-destructive hover:text-destructive"
                            onClick={() => removeItem(index)}
                            disabled={pending}
                          >
                            <TrashIcon className="size-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    )
                  })
                )}
              </TableBody>
            </Table>
          </div>
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
            disabled={pending || itemsLoading}
            className="min-w-28"
          >
            {pending && <Spinner data-icon="inline-start" />}
            Save changes
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
