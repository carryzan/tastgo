'use client'

import { useState, useTransition } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { useKitchen } from '@/hooks/use-kitchen'
import { reverseBatch } from '../_lib/batch-actions'
import { BATCHES_QUERY_KEY } from '../_lib/queries'
import type { Batch } from './batch-columns'
import { Button } from '@/components/ui/button'
import { Spinner } from '@/components/ui/spinner'
import { Textarea } from '@/components/ui/textarea'
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
  FieldError,
  FieldGroup,
  FieldLabel,
} from '@/components/ui/field'

interface ReverseBatchDialogProps {
  batch: Batch
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function ReverseBatchDialog({
  batch,
  open,
  onOpenChange,
}: ReverseBatchDialogProps) {
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
    const reason = (fd.get('reason') as string).trim()

    if (!reason) return setError('A reason is required to reverse a batch.')

    startTransition(async () => {
      try {
        const result = await reverseBatch(batch.id, kitchen.id, reason)
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
          <DialogTitle>Reverse Batch</DialogTitle>
          <DialogDescription>
            This will reverse <strong>{recipeName}</strong> and restore all
            ingredient stock. This action cannot be undone.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <FieldGroup>
            <Field>
              <FieldLabel htmlFor="reversal-reason">Reason</FieldLabel>
              <Textarea
                id="reversal-reason"
                name="reason"
                placeholder="Describe why this batch is being reversed…"
                rows={3}
                required
              />
            </Field>
          </FieldGroup>
          {error && <FieldError className="mt-2">{error}</FieldError>}
          <DialogFooter className="mt-4">
            <DialogClose asChild>
              <Button variant="outline" disabled={pending}>
                Cancel
              </Button>
            </DialogClose>
            <Button
              type="submit"
              variant="destructive"
              disabled={pending}
              className="min-w-28"
            >
              {pending && <Spinner data-icon="inline-start" />}
              Reverse Batch
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
