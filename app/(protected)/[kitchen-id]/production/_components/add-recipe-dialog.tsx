'use client'

import { useState, useTransition } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { useKitchen } from '@/hooks/use-kitchen'
import { createRecipe } from '../_lib/recipe-actions'
import { RECIPES_QUERY_KEY } from '../_lib/queries'
import { parseRecipeFormValues } from './recipe-form'
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
} from '@/components/ui/dialog'
import {
  Field,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
} from '@/components/ui/field'
import { Switch } from '@/components/ui/switch'

interface AddRecipeDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function AddRecipeDialog({ open, onOpenChange }: AddRecipeDialogProps) {
  const { kitchen } = useKitchen()
  const queryClient = useQueryClient()

  const [trackStock, setTrackStock] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()

  function handleOpenChange(next: boolean) {
    if (pending) return
    onOpenChange(next)
    if (!next) {
      setError(null)
      setTrackStock(false)
    }
  }

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(null)

    const values = parseRecipeFormValues(e.currentTarget)
    if (!values.name) return

    startTransition(async () => {
      try {
        const result = await createRecipe({
          kitchen_id: kitchen.id,
          name: values.name,
          track_stock: values.track_stock,
          variance_tolerance_percentage: values.variance_tolerance_percentage,
        })

        if (result instanceof Error) return setError(result.message)

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
          <DialogTitle>Add Recipe</DialogTitle>
          <DialogDescription>Create a new production recipe.</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
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
                When enabled, batches will deduct from inventory.
              </FieldDescription>
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
              Add Recipe
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
