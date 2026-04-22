'use client'

import { useState, useTransition } from 'react'
import { useQueryClient } from '@tanstack/react-query'
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
import { FieldError, FieldGroup, FieldLabel } from '@/components/ui/field'
import { Spinner } from '@/components/ui/spinner'
import { Textarea } from '@/components/ui/textarea'
import { reverseExpenseRecord } from '../_lib/expense-actions'
import { EXPENSE_RECORDS_QUERY_KEY, type ExpenseRecord } from '../_lib/queries'

interface ReverseExpenseDialogProps {
  kitchenId: string
  expense: ExpenseRecord | null
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function ReverseExpenseDialog({
  kitchenId,
  expense,
  open,
  onOpenChange,
}: ReverseExpenseDialogProps) {
  const queryClient = useQueryClient()
  const [reason, setReason] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()

  function handleClose(next: boolean) {
    if (pending) return
    onOpenChange(next)
    if (!next) {
      setReason('')
      setError(null)
    }
  }

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError(null)

    if (!expense) return
    if (!reason.trim()) {
      setError('Enter a reversal reason.')
      return
    }

    startTransition(async () => {
      const result = await reverseExpenseRecord(kitchenId, expense.id, reason.trim())
      if (result instanceof Error) {
        setError(result.message)
        return
      }

      queryClient.invalidateQueries({ queryKey: EXPENSE_RECORDS_QUERY_KEY })
      handleClose(false)
    })
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Reverse expense</DialogTitle>
          <DialogDescription>
            Reverse <span className="font-medium">{expense?.name ?? 'this expense'}</span>.
            The original record will remain immutable and a reversal entry will be posted.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit}>
          <FieldGroup>
            <div className="grid gap-2">
              <FieldLabel htmlFor="expense-reversal-reason">Reason</FieldLabel>
              <Textarea
                id="expense-reversal-reason"
                value={reason}
                onChange={(event) => setReason(event.target.value)}
                placeholder="Explain why this expense is being reversed"
                disabled={pending}
              />
            </div>
          </FieldGroup>

          {error ? <FieldError className="mt-4">{error}</FieldError> : null}

          <DialogFooter className="mt-6">
            <DialogClose asChild>
              <Button variant="outline" type="button" disabled={pending}>
                Cancel
              </Button>
            </DialogClose>
            <Button type="submit" variant="destructive" disabled={pending} className="min-w-28">
              {pending ? <Spinner data-icon="inline-start" /> : null}
              Reverse
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
