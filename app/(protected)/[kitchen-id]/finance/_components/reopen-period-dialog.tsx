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
import { Field, FieldError, FieldGroup, FieldLabel } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { Spinner } from '@/components/ui/spinner'
import { reopenAccountingPeriod } from '../_lib/period-actions'
import { ACCOUNTING_PERIODS_QUERY_KEY } from '../_lib/queries'
import type { AccountingPeriod } from './accounting-period-columns'

interface ReopenPeriodDialogProps {
  period: AccountingPeriod | null
  open: boolean
  onOpenChange: (open: boolean) => void
  kitchenId: string
}

export function ReopenPeriodDialog({
  period,
  open,
  onOpenChange,
  kitchenId,
}: ReopenPeriodDialogProps) {
  const queryClient = useQueryClient()
  const [reason, setReason] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  function handleConfirm() {
    if (!period) return
    setError(null)
    if (reason.trim().length < 5) {
      setError('Reason must be at least 5 characters.')
      return
    }
    startTransition(async () => {
      const result = await reopenAccountingPeriod(
        kitchenId,
        period.id,
        reason.trim()
      )
      if (result instanceof Error) {
        setError(result.message)
        return
      }
      onOpenChange(false)
      setReason('')
      queryClient.invalidateQueries({ queryKey: ACCOUNTING_PERIODS_QUERY_KEY })
    })
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) {
          setReason('')
          setError(null)
        }
        onOpenChange(next)
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Reopen period</DialogTitle>
          <DialogDescription>
            Reopening &quot;{period?.name}&quot; will allow new journal entries.
            Provide a reason (minimum 5 characters).
          </DialogDescription>
        </DialogHeader>
        <FieldGroup>
          <Field>
            <FieldLabel htmlFor="reopen-reason">Reason</FieldLabel>
            <Input
              id="reopen-reason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="e.g. Correction required"
              disabled={isPending}
            />
          </Field>
        </FieldGroup>
        {error && <FieldError className="mt-2">{error}</FieldError>}
        <DialogFooter className="mt-4">
          <DialogClose asChild>
            <Button type="button" variant="outline" disabled={isPending}>
              Cancel
            </Button>
          </DialogClose>
          <Button
            onClick={handleConfirm}
            disabled={isPending || reason.trim().length < 5}
            className="min-w-28"
          >
            {isPending && <Spinner data-icon="inline-start" />}
            Reopen
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
