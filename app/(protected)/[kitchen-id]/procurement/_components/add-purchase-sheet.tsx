'use client'

import { useCallback, useMemo, useState, useTransition } from 'react'
import { PlusIcon, TrashIcon } from 'lucide-react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useKitchen } from '@/hooks/use-kitchen'
import {
  buildInventoryUomOptions,
  defaultUomId,
  fetchInventoryUomConversions,
  type InventoryUomConversion,
  type KitchenUom,
} from '@/lib/uom-conversions'
import { createPurchase } from '../_lib/purchase-actions'
import {
  formatPurchaseAmount,
  lineTotalFromParts,
  normalizePurchaseDecimalInput,
  parsePurchaseDecimal,
  unitCostFromLineTotal,
} from '../_lib/purchase-line-math'
import { PURCHASES_QUERY_KEY } from '../_lib/queries'
import {
  fetchActiveSuppliers,
  fetchActiveInventoryItems,
} from '../_lib/client-queries'
import { Button } from '@/components/ui/button'
import {
  Combobox,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxInput,
  ComboboxItem,
  ComboboxList,
} from '@/components/ui/combobox'
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
  uom_id: string
  ordered_quantity: string
  unit_cost: string
  line_total: string
  price_input: 'unit-cost' | 'line-total'
}

const comboboxContentClass =
  'z-100 pointer-events-auto max-h-[min(20rem,var(--available-height))] overflow-hidden'
const comboboxListClass =
  'max-h-72 overflow-y-auto overscroll-contain pr-1 [scrollbar-width:thin] [-ms-overflow-style:auto]'

interface AddPurchaseSheetProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function AddPurchaseSheet({ open, onOpenChange }: AddPurchaseSheetProps) {
  const { kitchen, unitsOfMeasure } = useKitchen()
  const uoms = unitsOfMeasure as KitchenUom[]
  const queryClient = useQueryClient()
  const [supplierId, setSupplierId] = useState('')
  const [invoiceCode, setInvoiceCode] = useState('')
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

  const { data: uomConversions = [] } = useQuery<InventoryUomConversion[]>({
    queryKey: ['inventory-uom-conversions', kitchen.id],
    queryFn: () => fetchInventoryUomConversions(kitchen.id),
    enabled: open,
  })

  function handleOpenChange(next: boolean) {
    if (pending) return
    if (!next) {
      setSupplierId('')
      setInvoiceCode('')
      setItems([])
      setError(null)
    }
    onOpenChange(next)
  }

  function addItem() {
    setItems((prev) => [
      ...prev,
      {
        inventory_item_id: '',
        uom_id: '',
        ordered_quantity: '',
        unit_cost: '',
        line_total: '',
        price_input: 'unit-cost',
      },
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

  function updateQuantity(index: number, value: string) {
    const orderedQuantity = normalizePurchaseDecimalInput(value)
    if (orderedQuantity === null) return

    setItems((prev) =>
      prev.map((item, i) =>
        i === index
          ? {
              ...item,
              ordered_quantity: orderedQuantity,
              unit_cost:
                item.price_input === 'line-total'
                  ? unitCostFromLineTotal(item.line_total, orderedQuantity) ?? ''
                  : item.unit_cost,
              line_total:
                item.price_input === 'line-total'
                  ? item.line_total
                  : lineTotalFromParts(orderedQuantity, item.unit_cost),
            }
          : item
      )
    )
  }

  function updateUnitCost(index: number, value: string) {
    const unitCost = normalizePurchaseDecimalInput(value)
    if (unitCost === null) return

    setItems((prev) =>
      prev.map((item, i) =>
        i === index
          ? {
              ...item,
              unit_cost: unitCost,
              line_total: lineTotalFromParts(item.ordered_quantity, unitCost),
              price_input: 'unit-cost',
            }
          : item
      )
    )
  }

  function updateLineTotal(index: number, value: string) {
    const lineTotal = normalizePurchaseDecimalInput(value)
    if (lineTotal === null) return

    setItems((prev) =>
      prev.map((item, i) =>
        i === index
          ? {
              ...item,
              line_total: lineTotal,
              unit_cost:
                unitCostFromLineTotal(lineTotal, item.ordered_quantity) ?? '',
              price_input: 'line-total',
            }
          : item
      )
    )
  }

  const inventoryLabelById = useMemo(() => {
    const map = new Map<string, string>()
    for (const inv of inventoryItems ?? []) {
      map.set(inv.id, inv.name)
    }
    return map
  }, [inventoryItems])

  const usedItemIds = useMemo(
    () => new Set(items.map((i) => i.inventory_item_id).filter(Boolean)),
    [items]
  )

  const purchaseTotal = useMemo(
    () =>
      items.reduce(
        (sum, item) => sum + (parsePurchaseDecimal(item.line_total) ?? 0),
        0
      ),
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
      const orderedQuantity = parsePurchaseDecimal(item.ordered_quantity)
      const unitCost = parsePurchaseDecimal(item.unit_cost)
      const lineTotal = parsePurchaseDecimal(item.line_total)

      if (!item.inventory_item_id) return setError('Select an item for each row.')
      if (!item.uom_id) return setError('Configure and select a purchase UOM for each row.')
      if (orderedQuantity === null || orderedQuantity <= 0)
        return setError('Enter a valid quantity for each item.')
      if (item.line_total.trim() && lineTotal === null)
        return setError('Enter a valid total for each item.')
      if (unitCost === null)
        return setError('Enter a valid unit cost for each item.')
    }

    startTransition(async () => {
      try {
        const result = await createPurchase(
          kitchen.id,
          supplierId,
          items.map((item) => ({
            inventory_item_id: item.inventory_item_id,
            uom_id: item.uom_id,
            ordered_quantity: Number(item.ordered_quantity),
            unit_cost: Number(item.unit_cost),
          })),
          invoiceCode.trim() || null
        )
        if (result instanceof Error) return setError(result.message)
        onOpenChange(false)
        queryClient.invalidateQueries({ queryKey: PURCHASES_QUERY_KEY })
      } catch {
        setError('Something went wrong. Please try again.')
      }
    })
  }

  return (
    <Sheet open={open} onOpenChange={handleOpenChange}>
      <SheetContent
        className="flex flex-col gap-0 p-0 sm:max-w-3xl"
        showCloseButton={!pending}
        onInteractOutside={(e) => {
          if (pending) e.preventDefault()
        }}
        onEscapeKeyDown={(e) => {
          if (pending) e.preventDefault()
        }}
      >
        <SheetHeader className="border-b px-4 py-4">
          <SheetTitle>Add purchase</SheetTitle>
          <SheetDescription>
            Create a new purchase order for a supplier.
          </SheetDescription>
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
                <FieldLabel htmlFor="add-po-invoice">Invoice code</FieldLabel>
                <Input
                  id="add-po-invoice"
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
              disabled={pending}
            >
              <PlusIcon />
              Add item
            </Button>
          </div>

          <div className="border-t shrink-0" />

          {/* Scrollable table */}
          <div className="flex-1 overflow-x-auto overflow-y-auto">
            <Table className="w-full min-w-[832px] table-fixed">
              <colgroup>
                <col />
                <col className="w-28" />
                <col className="w-36" />
                <col className="w-40" />
                <col className="w-36" />
                <col className="w-10" />
              </colgroup>
              <TableHeader>
                <TableRow>
                  <TableHead className="pl-4">Item</TableHead>
                  <TableHead className="w-28">UOM</TableHead>
                  <TableHead className="w-36 min-w-36">Qty</TableHead>
                  <TableHead className="w-40 min-w-40">Unit cost</TableHead>
                  <TableHead className="w-36 min-w-36">Total</TableHead>
                  <TableHead className="w-10" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={6}
                      className="h-32 text-center text-muted-foreground"
                    >
                      No items yet. Click &ldquo;Add item&rdquo; to begin.
                    </TableCell>
                  </TableRow>
                ) : (
                  items.map((item, index) => {
                    const available = availableItemsForRow(index)
                    const selectedInventoryItem =
                      inventoryItems?.find((inv) => inv.id === item.inventory_item_id) ?? null
                    const uomOptions = buildInventoryUomOptions(
                      selectedInventoryItem,
                      uomConversions,
                      uoms,
                      'purchase'
                    )
                    return (
                      <TableRow key={index}>
                        <TableCell className="w-full min-w-0 whitespace-normal pl-4">
                          <div className="w-full min-w-0">
                            <Combobox
                              items={available.map((inv) => inv.id)}
                              value={item.inventory_item_id || null}
                              onValueChange={(nextValue) => {
                                const v = nextValue ?? ''
                                const nextItem =
                                  inventoryItems?.find((inv) => inv.id === v) ?? null
                                const nextOptions = buildInventoryUomOptions(
                                  nextItem,
                                  uomConversions,
                                  uoms,
                                  'purchase'
                                )
                                updateItem(index, {
                                  inventory_item_id: v,
                                  uom_id: defaultUomId(nextOptions),
                                })
                              }}
                              modal
                              itemToStringLabel={(id) =>
                                inventoryLabelById.get(String(id)) ?? ''
                              }
                            >
                              <ComboboxInput
                                placeholder="Select item"
                                className="w-full min-w-0"
                                disabled={pending}
                              />
                              <ComboboxContent className={comboboxContentClass}>
                                <ComboboxEmpty>No items found.</ComboboxEmpty>
                                <ComboboxList
                                  className={comboboxListClass}
                                  onWheel={(event) => event.stopPropagation()}
                                  onTouchMove={(event) => event.stopPropagation()}
                                >
                                  {(id: string) => (
                                    <ComboboxItem key={id} value={id}>
                                      {inventoryLabelById.get(id) ?? id}
                                    </ComboboxItem>
                                  )}
                                </ComboboxList>
                              </ComboboxContent>
                            </Combobox>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Select
                            value={item.uom_id || undefined}
                            onValueChange={(v) => updateItem(index, { uom_id: v })}
                            disabled={pending || !item.inventory_item_id || uomOptions.length === 0}
                          >
                            <SelectTrigger className="w-full">
                              <SelectValue placeholder="UOM" />
                            </SelectTrigger>
                            <SelectContent>
                              {uomOptions.map((option) => (
                                <SelectItem key={option.uom_id} value={option.uom_id}>
                                  {option.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </TableCell>
                        <TableCell className="w-36 min-w-36">
                          <Input
                            type="text"
                            inputMode="decimal"
                            pattern="[0-9]*[.]?[0-9]*"
                            autoComplete="off"
                            className="tabular-nums"
                            value={item.ordered_quantity}
                            onChange={(e) => updateQuantity(index, e.target.value)}
                            disabled={pending}
                            placeholder="0"
                          />
                        </TableCell>
                        <TableCell className="w-40 min-w-40">
                          <Input
                            type="text"
                            inputMode="decimal"
                            pattern="[0-9]*[.]?[0-9]*"
                            autoComplete="off"
                            className="tabular-nums"
                            value={item.unit_cost}
                            onChange={(e) => updateUnitCost(index, e.target.value)}
                            disabled={pending}
                            placeholder="0.00"
                          />
                        </TableCell>
                        <TableCell className="w-36 min-w-36">
                          <Input
                            type="text"
                            inputMode="decimal"
                            pattern="[0-9]*[.]?[0-9]*"
                            autoComplete="off"
                            className="tabular-nums"
                            value={item.line_total}
                            onChange={(e) => updateLineTotal(index, e.target.value)}
                            disabled={pending}
                            placeholder="0.00"
                          />
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
          <div className="flex w-full items-center justify-between text-sm">
            <span className="font-medium">Total</span>
            <span className="font-medium tabular-nums text-muted-foreground">
              {formatPurchaseAmount(purchaseTotal)}
            </span>
          </div>
          <Button type="button" onClick={handleSave} disabled={pending} className="min-w-28">
            {pending && <Spinner data-icon="inline-start" />}
            Create purchase
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
