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
import { reverseOfflineSettlement } from '../_lib/actions'
import { OFFLINE_SETTLEMENTS_QUERY_KEY } from '../_lib/queries'
import type { OfflineSettlement } from './offline-settlement-columns'

interface ReverseOfflineSettlementDialogProps {
  kitchenId: string
  settlement: OfflineSettlement | null
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function ReverseOfflineSettlementDialog({
  kitchenId,
  settlement,
  open,
  onOpenChange,
}: ReverseOfflineSettlementDialogProps) {
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

    if (!settlement) return
    if (!reason.trim()) {
      setError('Enter a reversal reason.')
      return
    }

    startTransition(async () => {
      const result = await reverseOfflineSettlement(
        kitchenId,
        settlement.id,
        reason.trim()
      )
      if (result instanceof Error) {
        setError(result.message)
        return
      }

      queryClient.invalidateQueries({ queryKey: OFFLINE_SETTLEMENTS_QUERY_KEY })
      handleClose(false)
    })
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Reverse offline settlement</DialogTitle>
          <DialogDescription>
            Reverse only when the cash settlement record itself was an operational
            mistake. Customer money-back cases should use refunds.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit}>
          <FieldGroup>
            <div className="grid gap-2">
              <FieldLabel htmlFor="offline-settlement-reversal-reason">
                Reason
              </FieldLabel>
              <Textarea
                id="offline-settlement-reversal-reason"
                value={reason}
                onChange={(event) => setReason(event.target.value)}
                placeholder="Explain why this settlement record is being reversed"
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
            <Button
              type="submit"
              variant="destructive"
              disabled={pending}
              className="min-w-28"
            >
              {pending ? <Spinner data-icon="inline-start" /> : null}
              Reverse
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
