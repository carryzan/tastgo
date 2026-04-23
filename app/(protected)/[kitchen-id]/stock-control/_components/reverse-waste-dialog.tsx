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
import { INVENTORY_QUERY_KEY } from '../../inventory/_lib/queries'
import { reverseWasteLog } from '../_lib/actions'
import {
  COUNTABLE_STOCK_QUERY_KEY,
} from '../_lib/client-queries'
import { WASTE_LEDGER_QUERY_KEY } from '../_lib/queries'
import type { WasteLedgerEntry } from './waste-columns'

interface ReverseWasteDialogProps {
  kitchenId: string
  waste: WasteLedgerEntry | null
  open: boolean
  onOpenChange: (open: boolean) => void
}

function wasteName(waste: WasteLedgerEntry | null) {
  return (
    waste?.inventory_items?.name ??
    waste?.production_recipes?.name ??
    'this waste entry'
  )
}

export function ReverseWasteDialog({
  kitchenId,
  waste,
  open,
  onOpenChange,
}: ReverseWasteDialogProps) {
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

    if (!waste) return
    if (!reason.trim()) {
      setError('Enter a reversal reason.')
      return
    }

    startTransition(async () => {
      const result = await reverseWasteLog(kitchenId, waste.id, reason.trim())
      if (result instanceof Error) {
        setError(result.message)
        return
      }

      queryClient.invalidateQueries({ queryKey: WASTE_LEDGER_QUERY_KEY })
      queryClient.invalidateQueries({ queryKey: COUNTABLE_STOCK_QUERY_KEY })
      queryClient.invalidateQueries({ queryKey: INVENTORY_QUERY_KEY })
      handleClose(false)
    })
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Reverse waste</DialogTitle>
          <DialogDescription>
            Reverse <span className="font-medium">{wasteName(waste)}</span>.
            Stock will be restored and the waste journal impact will be offset.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit}>
          <FieldGroup>
            <div className="grid gap-2">
              <FieldLabel htmlFor="waste-reversal-reason">Reason</FieldLabel>
              <Textarea
                id="waste-reversal-reason"
                value={reason}
                onChange={(event) => setReason(event.target.value)}
                placeholder="Explain why this waste entry is being reversed"
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
