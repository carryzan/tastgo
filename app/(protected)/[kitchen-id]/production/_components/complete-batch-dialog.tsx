'use client'

import { useState, useTransition } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useKitchen } from '@/hooks/use-kitchen'
import {
  buildProductionRecipeUomOptions,
  defaultUomId,
  fetchProductionRecipeUomConversions,
  type KitchenUom,
  type ProductionRecipeUomConversion,
} from '@/lib/uom-conversions'
import { completeBatch } from '../_lib/batch-actions'
import { BATCHES_QUERY_KEY } from '../_lib/queries'
import type { Batch } from './batch-columns'
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

interface CompleteBatchDialogProps {
  batch: Batch
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function CompleteBatchDialog({
  batch,
  open,
  onOpenChange,
}: CompleteBatchDialogProps) {
  const { kitchen, unitsOfMeasure } = useKitchen()
  const uoms = unitsOfMeasure as KitchenUom[]
  const queryClient = useQueryClient()
  const [error, setError] = useState<string | null>(null)
  const [actualUomId, setActualUomId] = useState(batch.actual_uom_id ?? batch.target_uom_id ?? '')
  const [pending, startTransition] = useTransition()
  const { data: uomConversions = [] } = useQuery<ProductionRecipeUomConversion[]>({
    queryKey: ['production-recipe-uom-conversions', kitchen.id],
    queryFn: () => fetchProductionRecipeUomConversions(kitchen.id),
    enabled: open,
  })
  const uomOptions = buildProductionRecipeUomOptions(
    {
      id: batch.production_recipe_id,
      storage_uom_id: batch.production_recipes?.storage_uom_id ?? null,
    },
    uomConversions,
    uoms,
    'production'
  )
  const selectedActualUomId = actualUomId || defaultUomId(uomOptions)

  function handleOpenChange(next: boolean) {
    if (pending) return
    onOpenChange(next)
    if (!next) {
      setError(null)
      setActualUomId(batch.actual_uom_id ?? batch.target_uom_id ?? '')
    }
  }

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(null)

    const fd = new FormData(e.currentTarget)
    const raw = fd.get('actual_quantity') as string
    const actualQuantity = parseFloat(raw)

    if (isNaN(actualQuantity) || actualQuantity < 0)
      return setError('Actual quantity must be 0 or greater.')
    if (!selectedActualUomId) return setError('Configure and select a production UOM.')

    startTransition(async () => {
      try {
        const result = await completeBatch(
          batch.id,
          kitchen.id,
          actualQuantity,
          selectedActualUomId
        )
        if (result instanceof Error) return setError(result.message)

        onOpenChange(false)
        queryClient.invalidateQueries({ queryKey: BATCHES_QUERY_KEY })
      } catch {
        setError('Something went wrong. Please try again.')
      }
    })
  }

  const recipeName = batch.production_recipes?.name ?? 'this batch'

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent
        className="sm:max-w-sm"
        onInteractOutside={(e) => {
          if (pending) e.preventDefault()
        }}
        onEscapeKeyDown={(e) => {
          if (pending) e.preventDefault()
        }}
      >
        <DialogHeader>
          <DialogTitle>Complete Batch</DialogTitle>
          <DialogDescription>
            Record the actual quantity produced for{' '}
            <strong>{recipeName}</strong>. Target was{' '}
            {batch.target_quantity} units.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <FieldGroup>
            <Field>
              <FieldLabel htmlFor="actual-qty">Actual Quantity</FieldLabel>
              <Input
                id="actual-qty"
                name="actual_quantity"
                type="number"
                min="0"
                step="0.0001"
                placeholder="0.0000"
                required
              />
              <FieldDescription>
                Enter 0 if nothing was produced.
              </FieldDescription>
            </Field>
            <Field>
              <FieldLabel>Production UOM</FieldLabel>
              <Select
                value={selectedActualUomId || undefined}
                onValueChange={setActualUomId}
                disabled={pending || uomOptions.length === 0}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Configure UOM first" />
                </SelectTrigger>
                <SelectContent>
                  {uomOptions.map((option) => (
                    <SelectItem key={option.uom_id} value={option.uom_id}>
                      {option.label}
                    </SelectItem>
                  ))}
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
              Complete
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
