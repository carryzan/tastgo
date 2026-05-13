'use client'

import { useState, useTransition, useEffect, useMemo } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { useKitchen } from '@/hooks/use-kitchen'
import { createClient } from '@/lib/supabase/client'
import {
  buildProductionRecipeUomOptions,
  defaultUomId,
  fetchProductionRecipeUomConversions,
  type KitchenUom,
  type ProductionRecipeUomConversion,
} from '@/lib/uom-conversions'
import { createBatch } from '../_lib/batch-actions'
import { BATCHES_QUERY_KEY } from '../_lib/queries'
import type { ServicePeriod } from '../_lib/service-periods'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Spinner } from '@/components/ui/spinner'
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import {
  Combobox,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxInput,
  ComboboxItem,
  ComboboxList,
} from '@/components/ui/combobox'
import {
  Field,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
} from '@/components/ui/field'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

interface RecipeOption {
  id: string
  name: string
  current_version_id: string | null
  storage_uom_id: string | null
}

interface CreateBatchDialogProps {
  servicePeriods: ServicePeriod[]
}

export function CreateBatchDialog({ servicePeriods }: CreateBatchDialogProps) {
  const { kitchen, membership, unitsOfMeasure } = useKitchen()
  const uoms = unitsOfMeasure as KitchenUom[]
  const queryClient = useQueryClient()

  const [open, setOpen] = useState(false)
  const [recipes, setRecipes] = useState<RecipeOption[]>([])
  const [uomConversions, setUomConversions] = useState<ProductionRecipeUomConversion[]>([])
  const [selectedRecipeId, setSelectedRecipeId] = useState('')
  const [targetUomId, setTargetUomId] = useState('')
  const [servicePeriodId, setServicePeriodId] = useState('__none__')
  const [error, setError] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()

  const activeServicePeriods = servicePeriods.filter((sp) => sp.is_active)

  const recipeItems = useMemo(() => recipes.map((r) => r.id), [recipes])

  const recipeNameById = useMemo(() => {
    const map = new Map<string, string>()
    for (const r of recipes) {
      map.set(r.id, r.name)
    }
    return map
  }, [recipes])

  const servicePeriodItems = useMemo(
    () => ['__none__', ...activeServicePeriods.map((sp) => sp.id)],
    [activeServicePeriods]
  )

  const servicePeriodLabelById = useMemo(() => {
    const map = new Map<string, string>([['__none__', 'None']])
    for (const sp of activeServicePeriods) {
      map.set(sp.id, sp.name)
    }
    return map
  }, [activeServicePeriods])

  useEffect(() => {
    if (!open) return
    const supabase = createClient()
    Promise.all([
      supabase
      .from('production_recipes')
      .select('id, name, current_version_id, storage_uom_id')
      .eq('kitchen_id', kitchen.id)
      .eq('is_active', true)
      .eq('track_stock', true)
      .not('current_version_id', 'is', null)
      .order('name'),
      fetchProductionRecipeUomConversions(kitchen.id),
    ]).then(([recipesResult, conversions]) => {
      setRecipes((recipesResult.data ?? []) as RecipeOption[])
      setUomConversions(conversions)
    })
  }, [open, kitchen.id])

  function handleOpenChange(next: boolean) {
    if (pending) return
    setOpen(next)
    if (!next) {
      setError(null)
      setSelectedRecipeId('')
      setTargetUomId('')
      setServicePeriodId('__none__')
    }
  }

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(null)

    const fd = new FormData(e.currentTarget)
    const targetQuantity = parseFloat(fd.get('target_quantity') as string)

    if (!selectedRecipeId) return setError('Please select a recipe.')
    if (!targetQuantity || targetQuantity <= 0)
      return setError('Target quantity must be greater than 0.')

    const selectedRecipe = recipes.find((r) => r.id === selectedRecipeId)
    if (!selectedRecipe?.current_version_id)
      return setError('Selected recipe has no active version.')
    if (!targetUomId) return setError('Configure and select a production UOM.')

    startTransition(async () => {
      try {
        const result = await createBatch({
          kitchen_id: kitchen.id,
          production_recipe_id: selectedRecipeId,
          recipe_version_id: selectedRecipe.current_version_id!,
          service_period_id:
            servicePeriodId !== '__none__' ? servicePeriodId : null,
          target_quantity: targetQuantity,
          target_uom_id: targetUomId,
          created_by: (membership as unknown as { id: string }).id,
        })

        if (result instanceof Error) return setError(result.message)

        setOpen(false)
        queryClient.invalidateQueries({ queryKey: BATCHES_QUERY_KEY })
      } catch {
        setError('Something went wrong. Please try again.')
      }
    })
  }

  const blockClose = (e: { preventDefault(): void }) => {
    if (pending) e.preventDefault()
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button size="sm">
          Create Batch
        </Button>
      </DialogTrigger>
      <DialogContent
        className="sm:max-w-sm"
        onInteractOutside={blockClose}
        onEscapeKeyDown={blockClose}
      >
        <DialogHeader>
          <DialogTitle>Create Batch</DialogTitle>
          <DialogDescription>
            Start a new production batch from a recipe.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <FieldGroup>
            <Field>
              <FieldLabel htmlFor="batch-recipe">Recipe</FieldLabel>
              <div className="relative z-100">
                <Combobox
                  items={recipeItems}
                  value={selectedRecipeId || null}
                  onValueChange={(next) => {
                    const selected = recipes.find((recipe) => recipe.id === next) ?? null
                    setSelectedRecipeId(next ?? '')
                    setTargetUomId(
                      defaultUomId(
                        buildProductionRecipeUomOptions(
                          selected,
                          uomConversions,
                          uoms,
                          'production'
                        )
                      )
                    )
                  }}
                  modal={true}
                  itemToStringLabel={(id) => recipeNameById.get(String(id)) ?? ''}
                >
                  <ComboboxInput
                    id="batch-recipe"
                    placeholder="Select a recipe"
                    className="w-full"
                  />
                  <ComboboxContent className="z-100 pointer-events-auto">
                    <ComboboxEmpty>No recipes found.</ComboboxEmpty>
                    <ComboboxList>
                      {(item: string) => (
                        <ComboboxItem key={item} value={item}>
                          {recipeNameById.get(item) ?? item}
                        </ComboboxItem>
                      )}
                    </ComboboxList>
                  </ComboboxContent>
                </Combobox>
              </div>
            </Field>

            <Field>
              <FieldLabel>Production UOM</FieldLabel>
              <Select
                value={targetUomId || undefined}
                onValueChange={setTargetUomId}
                disabled={
                  !selectedRecipeId ||
                  buildProductionRecipeUomOptions(
                    recipes.find((recipe) => recipe.id === selectedRecipeId),
                    uomConversions,
                    uoms,
                    'production'
                  ).length === 0
                }
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Configure UOM first" />
                </SelectTrigger>
                <SelectContent>
                  {buildProductionRecipeUomOptions(
                    recipes.find((recipe) => recipe.id === selectedRecipeId),
                    uomConversions,
                    uoms,
                    'production'
                  ).map((option) => (
                    <SelectItem key={option.uom_id} value={option.uom_id}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>

            <Field>
              <FieldLabel htmlFor="batch-target-qty">
                Target Quantity
              </FieldLabel>
              <Input
                id="batch-target-qty"
                name="target_quantity"
                type="number"
                min="0.0001"
                step="0.0001"
                placeholder="0.0000"
                required
              />
              <FieldDescription>
                How many units you plan to produce.
              </FieldDescription>
            </Field>

            <Field>
              <FieldLabel htmlFor="batch-service-period">Service Period</FieldLabel>
              <div className="relative z-100">
                <Combobox
                  items={servicePeriodItems}
                  value={servicePeriodId}
                  onValueChange={(next) => {
                    setServicePeriodId(next ?? '__none__')
                  }}
                  modal={true}
                  itemToStringLabel={(id) =>
                    servicePeriodLabelById.get(String(id)) ?? ''
                  }
                >
                  <ComboboxInput
                    id="batch-service-period"
                    placeholder="Select service period"
                    className="w-full"
                  />
                  <ComboboxContent className="z-100 pointer-events-auto">
                    <ComboboxEmpty>No service periods found.</ComboboxEmpty>
                    <ComboboxList>
                      {(item: string) => (
                        <ComboboxItem key={item} value={item}>
                          {servicePeriodLabelById.get(item) ?? item}
                        </ComboboxItem>
                      )}
                    </ComboboxList>
                  </ComboboxContent>
                </Combobox>
              </div>
            </Field>
          </FieldGroup>

          {error && <FieldError className="mt-2">{error}</FieldError>}

          <DialogFooter className="mt-4">
            <DialogClose asChild>
              <Button variant="outline" disabled={pending}>
                Cancel
              </Button>
            </DialogClose>
            <Button type="submit" disabled={pending} className="min-w-28">
              {pending && <Spinner data-icon="inline-start" />}
              Create Batch
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
