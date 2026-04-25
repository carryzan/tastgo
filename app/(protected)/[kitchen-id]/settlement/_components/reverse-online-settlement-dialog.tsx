'use client'

import { useState, useTransition } from 'react'
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
import { reverseOnlineSettlement } from '../_lib/actions'

interface ReverseOnlineSettlementDialogProps {
  kitchenId: string
  settlementId: string
  open: boolean
  onOpenChange: (open: boolean) => void
  onReversed: () => void
}

export function ReverseOnlineSettlementDialog({
  kitchenId,
  settlementId,
  open,
  onOpenChange,
  onReversed,
}: ReverseOnlineSettlementDialogProps) {
  const [reason, setReason] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()

  function handleOpenChange(next: boolean) {
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

    if (!reason.trim()) {
      setError('Enter a reversal reason.')
      return
    }

    startTransition(async () => {
      const result = await reverseOnlineSettlement(
        kitchenId,
        settlementId,
        reason.trim()
      )
      if (result instanceof Error) {
        setError(result.message)
        return
      }

      handleOpenChange(false)
      onReversed()
    })
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Reverse online settlement</DialogTitle>
          <DialogDescription>
            Reverse the settlement journal and return included orders to unpaid.
            The order links remain for audit.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit}>
          <FieldGroup>
            <div className="grid gap-2">
              <FieldLabel htmlFor="online-settlement-reversal-reason">
                Reason
              </FieldLabel>
              <Textarea
                id="online-settlement-reversal-reason"
                value={reason}
                onChange={(event) => setReason(event.target.value)}
                placeholder="Explain why this settlement is being reversed"
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
