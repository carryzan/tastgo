'use client'

import { useMemo, useState, useTransition } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useKitchen } from '@/hooks/use-kitchen'
import {
  buildInventoryUomOptions,
  buildProductionRecipeUomOptions,
  defaultUomId,
  fetchInventoryUomConversions,
  fetchProductionRecipeUomConversions,
  type InventoryUomConversion,
  type KitchenUom,
  type ProductionRecipeUomConversion,
  type UomOption,
} from '@/lib/uom-conversions'
import { recordWasteLog } from '../_lib/actions'
import {
  COUNTABLE_STOCK_QUERY_KEY,
  fetchCountableStockItems,
} from '../_lib/client-queries'
import {
  WASTE_LEDGER_QUERY_KEY,
} from '../_lib/queries'
import { INVENTORY_QUERY_KEY } from '../../inventory/_lib/queries'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Field, FieldError, FieldGroup, FieldLabel } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Spinner } from '@/components/ui/spinner'
import { Textarea } from '@/components/ui/textarea'

interface RecordWasteSheetProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function RecordWasteSheet({
  open,
  onOpenChange,
}: RecordWasteSheetProps) {
  const { kitchen, unitsOfMeasure } = useKitchen()
  const uoms = unitsOfMeasure as KitchenUom[]
  const queryClient = useQueryClient()
  const [itemId, setItemId] = useState('')
  const [uomId, setUomId] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()

  const { data: stockRows = [] } = useQuery({
    queryKey: [...COUNTABLE_STOCK_QUERY_KEY, kitchen.id],
    queryFn: () => fetchCountableStockItems(kitchen.id),
    enabled: open,
  })

  const { data: inventoryUomConversions = [] } = useQuery<InventoryUomConversion[]>({
    queryKey: ['inventory-uom-conversions', kitchen.id],
    queryFn: () => fetchInventoryUomConversions(kitchen.id),
    enabled: open,
  })

  const { data: productionUomConversions = [] } = useQuery<ProductionRecipeUomConversion[]>({
    queryKey: ['production-recipe-uom-conversions', kitchen.id],
    queryFn: () => fetchProductionRecipeUomConversions(kitchen.id),
    enabled: open,
  })

  const availableRows = useMemo(
    () => stockRows.filter((row) => Number(row.current_quantity) > 0),
    [stockRows]
  )

  const selectedItem = availableRows.find((row) => row.id === itemId) ?? null
  const selectedUomOptions: UomOption[] = selectedItem
    ? selectedItem.item_type === 'inventory_item'
      ? buildInventoryUomOptions(
          {
            id: selectedItem.inventory_item_id ?? '',
            storage_uom_id: selectedItem.storage_uom_id,
          },
          inventoryUomConversions,
          uoms,
          'waste'
        )
      : buildProductionRecipeUomOptions(
          {
            id: selectedItem.production_recipe_id ?? '',
            storage_uom_id: selectedItem.storage_uom_id,
          },
          productionUomConversions,
          uoms,
          'waste'
        )
    : []

  function handleOpenChange(next: boolean) {
    if (pending) return
    onOpenChange(next)
    if (!next) {
      setItemId('')
      setUomId('')
      setError(null)
    }
  }

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(null)

    const fd = new FormData(e.currentTarget)
    const quantity = Number(fd.get('quantity'))
    const reason = String(fd.get('reason') ?? '').trim()

    if (!selectedItem) return setError('Select an item.')
    const selectedUom = selectedUomOptions.find((option) => option.uom_id === uomId)
    if (!selectedUom) return setError('Configure and select a waste UOM.')
    if (!quantity || quantity <= 0) {
      return setError('Quantity must be greater than 0.')
    }
    if (quantity * selectedUom.factor_to_storage > Number(selectedItem.current_quantity)) {
      return setError('Quantity exceeds current stock.')
    }

    startTransition(async () => {
      try {
        const result = await recordWasteLog({
          kitchenId: kitchen.id,
          itemType: selectedItem.item_type,
          inventoryItemId: selectedItem.inventory_item_id,
          productionRecipeId: selectedItem.production_recipe_id,
          quantity,
          uomId,
          reason: reason || null,
        })
        if (result instanceof Error) return setError(result.message)

        onOpenChange(false)
        queryClient.invalidateQueries({ queryKey: WASTE_LEDGER_QUERY_KEY })
        queryClient.invalidateQueries({ queryKey: COUNTABLE_STOCK_QUERY_KEY })
        queryClient.invalidateQueries({ queryKey: INVENTORY_QUERY_KEY })
      } catch {
        setError('Something went wrong. Please try again.')
      }
    })
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent
        onInteractOutside={(e) => {
          if (pending) e.preventDefault()
        }}
        onEscapeKeyDown={(e) => {
          if (pending) e.preventDefault()
        }}
      >
        <DialogHeader>
          <DialogTitle>Record Waste</DialogTitle>
          <DialogDescription>
            Log wasted inventory or tracked production stock.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit}>
          <FieldGroup>
            <Field>
              <FieldLabel>Item</FieldLabel>
              <Select
                value={itemId}
                onValueChange={(value) => {
                  const nextItem = availableRows.find((row) => row.id === value) ?? null
                  const options =
                    nextItem?.item_type === 'inventory_item'
                      ? buildInventoryUomOptions(
                          {
                            id: nextItem.inventory_item_id ?? '',
                            storage_uom_id: nextItem.storage_uom_id,
                          },
                          inventoryUomConversions,
                          uoms,
                          'waste'
                        )
                      : buildProductionRecipeUomOptions(
                          {
                            id: nextItem?.production_recipe_id ?? '',
                            storage_uom_id: nextItem?.storage_uom_id ?? null,
                          },
                          productionUomConversions,
                          uoms,
                          'waste'
                        )
                  setItemId(value)
                  setUomId(defaultUomId(options))
                }}
                disabled={pending}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select item" />
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    {availableRows.map((row) => (
                      <SelectItem key={row.id} value={row.id}>
                        {row.name} ({row.count_uom_label ?? 'no UOM'})
                      </SelectItem>
                    ))}
                  </SelectGroup>
                </SelectContent>
              </Select>
            </Field>

            <Field>
              <FieldLabel htmlFor="waste-quantity">Quantity</FieldLabel>
              <Input
                id="waste-quantity"
                name="quantity"
                type="number"
                min="0.0001"
                step="0.0001"
                disabled={pending}
                required
              />
            </Field>

            <Field>
              <FieldLabel>UOM</FieldLabel>
              <Select
                value={uomId || undefined}
                onValueChange={setUomId}
                disabled={pending || !selectedItem || selectedUomOptions.length === 0}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Configure UOM first" />
                </SelectTrigger>
                <SelectContent>
                  {selectedUomOptions.map((option) => (
                    <SelectItem key={option.uom_id} value={option.uom_id}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>

            <Field>
              <FieldLabel htmlFor="waste-reason">Reason</FieldLabel>
              <Textarea
                id="waste-reason"
                name="reason"
                disabled={pending}
                placeholder="Optional"
              />
            </Field>
          </FieldGroup>
          {error ? <FieldError className="mt-4">{error}</FieldError> : null}

          <DialogFooter className="mt-6">
            <DialogClose asChild>
              <Button variant="outline" type="button" disabled={pending}>
                Cancel
              </Button>
            </DialogClose>
            <Button type="submit" disabled={pending} className="min-w-28">
              {pending && <Spinner data-icon="inline-start" />}
              Save
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
