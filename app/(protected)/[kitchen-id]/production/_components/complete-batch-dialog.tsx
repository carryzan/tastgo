'use client'

import { useState, useTransition } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { useKitchen } from '@/hooks/use-kitchen'
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
  const { kitchen } = useKitchen()
  const queryClient = useQueryClient()
  const [error, setError] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()

  function handleOpenChange(next: boolean) {
    if (pending) return
    onOpenChange(next)
    if (!next) setError(null)
  }

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(null)

    const fd = new FormData(e.currentTarget)
    const raw = fd.get('actual_quantity') as string
    const actualQuantity = parseFloat(raw)

    if (isNaN(actualQuantity) || actualQuantity < 0)
      return setError('Actual quantity must be 0 or greater.')

    startTransition(async () => {
      try {
        const result = await completeBatch(batch.id, kitchen.id, actualQuantity)
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
