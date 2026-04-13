'use client'

import { useState, useTransition, useEffect } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { useKitchen } from '@/hooks/use-kitchen'
import { createClient } from '@/lib/supabase/client'
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
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Field,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
} from '@/components/ui/field'

interface RecipeOption {
  id: string
  name: string
  current_version_id: string | null
}

interface CreateBatchDialogProps {
  servicePeriods: ServicePeriod[]
}

export function CreateBatchDialog({ servicePeriods }: CreateBatchDialogProps) {
  const { kitchen, membership } = useKitchen()
  const queryClient = useQueryClient()

  const [open, setOpen] = useState(false)
  const [recipes, setRecipes] = useState<RecipeOption[]>([])
  const [selectedRecipeId, setSelectedRecipeId] = useState('')
  const [servicePeriodId, setServicePeriodId] = useState('__none__')
  const [error, setError] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()

  const activeServicePeriods = servicePeriods.filter((sp) => sp.is_active)

  useEffect(() => {
    if (!open) return
    const supabase = createClient()
    supabase
      .from('production_recipes')
      .select('id, name, current_version_id')
      .eq('kitchen_id', kitchen.id)
      .eq('is_active', true)
      .order('name')
      .then(({ data }) => setRecipes((data ?? []) as RecipeOption[]))
  }, [open, kitchen.id])

  function handleOpenChange(next: boolean) {
    if (pending) return
    setOpen(next)
    if (!next) {
      setError(null)
      setSelectedRecipeId('')
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

    startTransition(async () => {
      try {
        const result = await createBatch({
          kitchen_id: kitchen.id,
          production_recipe_id: selectedRecipeId,
          recipe_version_id: selectedRecipe.current_version_id!,
          service_period_id:
            servicePeriodId !== '__none__' ? servicePeriodId : null,
          target_quantity: targetQuantity,
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
              <FieldLabel>Recipe</FieldLabel>
              <Select
                value={selectedRecipeId}
                onValueChange={setSelectedRecipeId}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select a recipe" />
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    {recipes.map((r) => (
                      <SelectItem key={r.id} value={r.id}>
                        {r.name}
                      </SelectItem>
                    ))}
                  </SelectGroup>
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
              <FieldLabel>Service Period</FieldLabel>
              <Select
                value={servicePeriodId}
                onValueChange={setServicePeriodId}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select service period" />
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    <SelectItem value="__none__">None</SelectItem>
                    {activeServicePeriods.map((sp) => (
                      <SelectItem key={sp.id} value={sp.id}>
                        {sp.name}
                      </SelectItem>
                    ))}
                  </SelectGroup>
                </SelectContent>
              </Select>
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
