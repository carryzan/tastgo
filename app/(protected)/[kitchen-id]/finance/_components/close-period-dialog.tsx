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
import { FieldError } from '@/components/ui/field'
import { Spinner } from '@/components/ui/spinner'
import { closeAccountingPeriod } from '../_lib/period-actions'
import { ACCOUNTING_PERIODS_QUERY_KEY } from '../_lib/queries'
import type { AccountingPeriod } from './accounting-period-columns'

interface ClosePeriodDialogProps {
  period: AccountingPeriod | null
  open: boolean
  onOpenChange: (open: boolean) => void
  kitchenId: string
}

export function ClosePeriodDialog({
  period,
  open,
  onOpenChange,
  kitchenId,
}: ClosePeriodDialogProps) {
  const queryClient = useQueryClient()
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  function handleConfirm() {
    if (!period) return
    startTransition(async () => {
      const result = await closeAccountingPeriod(kitchenId, period.id)
      if (result instanceof Error) {
        setError(result.message)
        return
      }
      onOpenChange(false)
      queryClient.invalidateQueries({ queryKey: ACCOUNTING_PERIODS_QUERY_KEY })
    })
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) setError(null)
        onOpenChange(next)
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Close period</DialogTitle>
          <DialogDescription>
            Close &quot;{period?.name}&quot;? This will prevent new journal
            entries from being posted to this period.
          </DialogDescription>
        </DialogHeader>
        {error && <FieldError className="mt-2">{error}</FieldError>}
        <DialogFooter className="mt-4">
          <DialogClose asChild>
            <Button type="button" variant="outline" disabled={isPending}>
              Cancel
            </Button>
          </DialogClose>
          <Button
            onClick={handleConfirm}
            disabled={isPending}
            className="min-w-28"
          >
            {isPending && <Spinner data-icon="inline-start" />}
            Close Period
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
