'use client'

import { useState, useTransition } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { useKitchen } from '@/hooks/use-kitchen'
import { updateRecipe } from '../_lib/recipe-actions'
import { RECIPES_QUERY_KEY } from '../_lib/queries'
import type { Recipe } from './recipe-columns'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Spinner } from '@/components/ui/spinner'
import { Switch } from '@/components/ui/switch'
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
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
  const { kitchen, unitsOfMeasure } = useKitchen()
  const queryClient = useQueryClient()
  const [isActive, setIsActive] = useState(recipe.is_active)
  const [storageUomId, setStorageUomId] = useState(recipe.storage_uom_id ?? '__none__')
  const [error, setError] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()

  function handleOpenChange(next: boolean) {
    if (pending) return
    onOpenChange(next)
    if (!next) {
      setError(null)
      setIsActive(recipe.is_active)
      setStorageUomId(recipe.storage_uom_id ?? '__none__')
    }
  }

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(null)

    const fd = new FormData(e.currentTarget)
    const name = (fd.get('name') as string).trim()
    const varianceRaw = fd.get('variance_tolerance_percentage') as string
    const variance_tolerance_percentage = varianceRaw ? parseFloat(varianceRaw) : null

    if (!name) return

    startTransition(async () => {
      try {
        const updates: Record<string, unknown> = {}

        if (name !== recipe.name) updates.name = name
        const nextStorageUomId = storageUomId === '__none__' ? null : storageUomId
        if (nextStorageUomId !== recipe.storage_uom_id) updates.storage_uom_id = nextStorageUomId
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

        onOpenChange(false)
        queryClient.invalidateQueries({ queryKey: RECIPES_QUERY_KEY })
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
      <DialogContent
        className="sm:max-w-sm"
        onInteractOutside={blockClose}
        onEscapeKeyDown={blockClose}
      >
        <DialogHeader>
          <DialogTitle>Edit Recipe</DialogTitle>
          <DialogDescription>Update this recipe&apos;s details.</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
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
                <Switch
                  checked={isActive}
                  onCheckedChange={setIsActive}
                />
              </div>
            </Field>

            {recipe.track_stock && (
              <Field>
                <FieldLabel>Storage UOM</FieldLabel>
                <Select value={storageUomId} onValueChange={setStorageUomId}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select storage UOM" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">Configure later</SelectItem>
                    {(unitsOfMeasure as { id: string; name: string; abbreviation: string }[]).map((uom) => (
                      <SelectItem key={uom.id} value={uom.id}>
                        {uom.name} ({uom.abbreviation})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
            )}
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
              Save Changes
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
