'use client'

import { useState, useTransition } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { useKitchen } from '@/hooks/use-kitchen'
import { createOpeningBalance } from '@/lib/actions/opening-balances'
import { createRecipe } from '../_lib/recipe-actions'
import { RECIPES_QUERY_KEY } from '../_lib/queries'
import { parseRecipeFormValues } from './recipe-form'
import { OpeningBalanceSection } from '@/components/shared/opening-balance-section'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Spinner } from '@/components/ui/spinner'
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import {
  Field,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
} from '@/components/ui/field'
import { Switch } from '@/components/ui/switch'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

interface AddRecipeSheetProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function AddRecipeSheet({ open, onOpenChange }: AddRecipeSheetProps) {
  const { kitchen, kitchenSettings, membership, unitsOfMeasure } = useKitchen()
  const queryClient = useQueryClient()

  const [trackStock, setTrackStock] = useState(false)
  const [storageUomId, setStorageUomId] = useState('__none__')
  const [error, setError] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()

  const openingDate =
    kitchenSettings && typeof kitchenSettings.opening_inventory_date === 'string'
      ? kitchenSettings.opening_inventory_date
      : null
  const showOpeningBalance =
    kitchenSettings?.opening_inventory_completed !== true &&
    !!openingDate &&
    trackStock &&
    storageUomId !== '__none__'

  function handleOpenChange(next: boolean) {
    if (pending) return
    onOpenChange(next)
    if (!next) {
      setError(null)
      setTrackStock(false)
      setStorageUomId('__none__')
    }
  }

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(null)

    const form = e.currentTarget
    const values = parseRecipeFormValues(form)
    if (!values.name) return

    startTransition(async () => {
      try {
        const result = await createRecipe({
          kitchen_id: kitchen.id,
          name: values.name,
          track_stock: values.track_stock,
          storage_uom_id: storageUomId === '__none__' ? null : storageUomId,
          variance_tolerance_percentage: values.variance_tolerance_percentage,
        })

        if (result instanceof Error) return setError(result.message)

        if (showOpeningBalance && openingDate) {
          const fd = new FormData(form)
          const obQty = parseFloat(fd.get('ob_quantity') as string)
          const obCost = parseFloat(fd.get('ob_unit_cost') as string)
          if (obQty > 0 && obCost > 0) {
            const obResult = await createOpeningBalance({
              kitchen_id: kitchen.id,
              production_recipe_id: result,
              quantity: obQty,
              unit_cost: obCost,
              as_of_date: openingDate,
              created_by: (membership as unknown as { id: string }).id,
            })
            if (obResult instanceof Error) return setError(obResult.message)
          }
        }

        form.reset()
        setTrackStock(false)
        setStorageUomId('__none__')
        onOpenChange(false)
        queryClient.invalidateQueries({ queryKey: RECIPES_QUERY_KEY })
      } catch {
        setError('Something went wrong. Please try again.')
      }
    })
  }

  return (
    <Sheet open={open} onOpenChange={handleOpenChange}>
      <SheetContent
        showCloseButton={!pending}
        onInteractOutside={(e) => {
          if (pending) e.preventDefault()
        }}
        onEscapeKeyDown={(e) => {
          if (pending) e.preventDefault()
        }}
      >
        <SheetHeader>
          <SheetTitle>Add Recipe</SheetTitle>
          <SheetDescription>Create a new production recipe.</SheetDescription>
        </SheetHeader>
        <form
          onSubmit={handleSubmit}
          className="flex flex-1 flex-col overflow-y-auto"
        >
          <div className="grid auto-rows-min gap-6 px-4 pb-5">
            <FieldGroup>
              <Field>
                <FieldLabel htmlFor="recipe-name">Name</FieldLabel>
                <Input
                  id="recipe-name"
                  name="name"
                  placeholder="Recipe name"
                  required
                />
              </Field>

              <Field>
                <FieldLabel htmlFor="recipe-variance">
                  Variance Tolerance (%)
                </FieldLabel>
                <Input
                  id="recipe-variance"
                  name="variance_tolerance_percentage"
                  type="number"
                  min="0"
                  max="100"
                  step="0.01"
                  placeholder="e.g. 5.00"
                />
                <FieldDescription>
                  Acceptable variance between TvA usage.
                </FieldDescription>
              </Field>

              <Field>
                <div className="flex items-center justify-between">
                  <FieldLabel htmlFor="recipe-track-stock">Track Stock</FieldLabel>
                  <input
                    type="hidden"
                    name="track_stock"
                    value={trackStock ? 'true' : 'false'}
                  />
                  <Switch
                    id="recipe-track-stock"
                    checked={trackStock}
                    onCheckedChange={setTrackStock}
                  />
                </div>
                <FieldDescription>
                  When enabled, production batches create finished stock.
                </FieldDescription>
              </Field>

              <Field>
                <FieldLabel>Output UOM</FieldLabel>
                <Select value={storageUomId} onValueChange={setStorageUomId}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select output UOM" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">Configure later</SelectItem>
                    {(
                      unitsOfMeasure as {
                        id: string
                        name: string
                        abbreviation: string
                      }[]
                    ).map((uom) => (
                      <SelectItem key={uom.id} value={uom.id}>
                        {uom.name} ({uom.abbreviation})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FieldDescription>
                  Required before creating a recipe version.
                </FieldDescription>
              </Field>

              {showOpeningBalance ? (
                <OpeningBalanceSection
                  removeBalance={false}
                  onRemoveBalanceChange={() => {}}
                />
              ) : null}
            </FieldGroup>
          </div>

          {error && (
            <div className="px-4">
              <FieldError>{error}</FieldError>
            </div>
          )}

          <SheetFooter>
            <Button type="submit" disabled={pending} className="min-w-28">
              {pending && <Spinner data-icon="inline-start" />}
              Add Recipe
            </Button>
            <SheetClose asChild>
              <Button variant="outline" disabled={pending}>
                Cancel
              </Button>
            </SheetClose>
          </SheetFooter>
        </form>
      </SheetContent>
    </Sheet>
  )
}
