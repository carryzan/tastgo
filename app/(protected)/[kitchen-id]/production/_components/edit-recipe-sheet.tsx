'use client'

import { useEffect, useState, useTransition } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { useKitchen } from '@/hooks/use-kitchen'
import {
  createOpeningBalance,
  deleteOpeningBalance,
  getProductionRecipeOpeningBalance,
  type OpeningBalance,
} from '@/lib/actions/opening-balances'
import { updateRecipe } from '../_lib/recipe-actions'
import { RECIPES_QUERY_KEY } from '../_lib/queries'
import type { Recipe } from './recipe-columns'
import { OpeningBalanceSection } from '@/components/shared/opening-balance-section'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Spinner } from '@/components/ui/spinner'
import { Switch } from '@/components/ui/switch'
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

interface EditRecipeSheetProps {
  recipe: Recipe
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function EditRecipeSheet({
  recipe,
  open,
  onOpenChange,
}: EditRecipeSheetProps) {
  const { kitchen, kitchenSettings, membership, unitsOfMeasure } = useKitchen()
  const queryClient = useQueryClient()
  const [isActive, setIsActive] = useState(recipe.is_active)
  const [storageUomId, setStorageUomId] = useState(
    recipe.storage_uom_id ?? '__none__'
  )
  const [error, setError] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()

  const openingDate =
    kitchenSettings && typeof kitchenSettings.opening_inventory_date === 'string'
      ? kitchenSettings.opening_inventory_date
      : null
  const canManageOpeningBalance =
    kitchenSettings?.opening_inventory_completed !== true &&
    !!openingDate &&
    recipe.track_stock &&
    storageUomId !== '__none__'

  const [balance, setBalance] = useState<OpeningBalance | null>(null)
  const [balanceLoaded, setBalanceLoaded] = useState(false)
  const [removeBalance, setRemoveBalance] = useState(false)

  useEffect(() => {
    if (!open || !canManageOpeningBalance) return
    let cancelled = false
    queueMicrotask(() => {
      if (cancelled) return
      setBalanceLoaded(false)
      void getProductionRecipeOpeningBalance(kitchen.id, recipe.id).then(
        (result) => {
          if (cancelled) return
          if (!(result instanceof Error)) setBalance(result)
          setBalanceLoaded(true)
        }
      )
    })
    return () => {
      cancelled = true
    }
  }, [open, recipe.id, kitchen.id, canManageOpeningBalance])

  function handleOpenChange(next: boolean) {
    if (pending) return
    onOpenChange(next)
    if (!next) {
      setError(null)
      setIsActive(recipe.is_active)
      setStorageUomId(recipe.storage_uom_id ?? '__none__')
      setBalance(null)
      setBalanceLoaded(false)
      setRemoveBalance(false)
    }
  }

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(null)

    const form = e.currentTarget
    const fd = new FormData(form)
    const name = (fd.get('name') as string).trim()
    const varianceRaw = fd.get('variance_tolerance_percentage') as string
    const variance_tolerance_percentage = varianceRaw
      ? parseFloat(varianceRaw)
      : null

    if (!name) return

    startTransition(async () => {
      try {
        const updates: Record<string, unknown> = {}

        if (name !== recipe.name) updates.name = name
        const nextStorageUomId =
          storageUomId === '__none__' ? null : storageUomId
        if (nextStorageUomId !== recipe.storage_uom_id) {
          updates.storage_uom_id = nextStorageUomId
        }
        if (
          variance_tolerance_percentage !==
          (recipe.variance_tolerance_percentage != null
            ? parseFloat(recipe.variance_tolerance_percentage)
            : null)
        ) {
          updates.variance_tolerance_percentage = variance_tolerance_percentage
        }
        if (isActive !== recipe.is_active) updates.is_active = isActive

        if (Object.keys(updates).length > 0) {
          const result = await updateRecipe(recipe.id, kitchen.id, updates)
          if (result instanceof Error) return setError(result.message)
        }

        if (removeBalance && balance?.id) {
          const delResult = await deleteOpeningBalance(balance.id)
          if (delResult instanceof Error) return setError(delResult.message)
        } else if (!balance && canManageOpeningBalance && openingDate) {
          const obQty = parseFloat(fd.get('ob_quantity') as string)
          const obCost = parseFloat(fd.get('ob_unit_cost') as string)
          if (obQty > 0 && obCost > 0) {
            const obResult = await createOpeningBalance({
              kitchen_id: kitchen.id,
              production_recipe_id: recipe.id,
              quantity: obQty,
              unit_cost: obCost,
              as_of_date: openingDate,
              created_by: (membership as unknown as { id: string }).id,
            })
            if (obResult instanceof Error) return setError(obResult.message)
          }
        }

        setBalance(null)
        setRemoveBalance(false)
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
          <SheetTitle>Edit Recipe</SheetTitle>
          <SheetDescription>Update this recipe&apos;s details.</SheetDescription>
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
                  defaultValue={recipe.name}
                  required
                />
              </Field>

              <Field>
                <FieldLabel htmlFor="recipe-variance">
                  Variance Tolerance %
                </FieldLabel>
                <Input
                  id="recipe-variance"
                  name="variance_tolerance_percentage"
                  type="number"
                  min="0"
                  max="100"
                  step="0.01"
                  placeholder="e.g. 5.00"
                  defaultValue={
                    recipe.variance_tolerance_percentage != null
                      ? parseFloat(recipe.variance_tolerance_percentage)
                      : ''
                  }
                />
                <FieldDescription>
                  Acceptable variance between theoretical and actual usage.
                </FieldDescription>
              </Field>

              <Field>
                <div className="flex items-center justify-between">
                  <FieldLabel>Active</FieldLabel>
                  <Switch checked={isActive} onCheckedChange={setIsActive} />
                </div>
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

              {canManageOpeningBalance && balanceLoaded && openingDate ? (
                <OpeningBalanceSection
                  balance={balance}
                  removeBalance={removeBalance}
                  onRemoveBalanceChange={setRemoveBalance}
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
              Save Changes
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
