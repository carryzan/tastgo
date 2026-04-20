'use client'

import * as React from 'react'
import { useQuery } from '@tanstack/react-query'
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import { Spinner } from '@/components/ui/spinner'
import { Field, FieldError, FieldGroup, FieldLabel } from '@/components/ui/field'
import { fetchActiveCashAccounts } from '../_lib/client-queries'
import { transferCashBetweenAccounts } from '../_lib/treasury-actions'

interface AddTransferDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  kitchenId: string
}

export function AddTransferDialog({
  open,
  onOpenChange,
  kitchenId,
}: AddTransferDialogProps) {
  const [fromAccountId, setFromAccountId] = React.useState('')
  const [toAccountId, setToAccountId] = React.useState('')
  const [amount, setAmount] = React.useState('')
  const [reason, setReason] = React.useState('')
  const [transferDate, setTransferDate] = React.useState(
    () => new Date().toISOString().split('T')[0]
  )
  const [error, setError] = React.useState<string | null>(null)
  const [pending, startTransition] = React.useTransition()

  const { data: accounts = [], isLoading } = useQuery({
    queryKey: ['cash-accounts-picker', kitchenId],
    queryFn: () => fetchActiveCashAccounts(kitchenId),
    enabled: open,
  })

  function handleClose() {
    onOpenChange(false)
    setFromAccountId('')
    setToAccountId('')
    setAmount('')
    setReason('')
    setTransferDate(new Date().toISOString().split('T')[0])
    setError(null)
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)

    const amt = parseFloat(amount)
    if (!fromAccountId || !toAccountId) {
      setError('Please select both accounts.')
      return
    }
    if (fromAccountId === toAccountId) {
      setError('From and To accounts must be different.')
      return
    }
    if (isNaN(amt) || amt <= 0) {
      setError('Please enter a valid amount greater than zero.')
      return
    }

    startTransition(async () => {
      const result = await transferCashBetweenAccounts(kitchenId, {
        fromAccountId,
        toAccountId,
        amount: amt,
        reason: reason.trim() || undefined,
        transferDate,
      })
      if (result instanceof Error) {
        setError(result.message)
        return
      }
      handleClose()
    })
  }

  const toOptions = accounts.filter((a) => a.id !== fromAccountId)

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Transfer Cash</DialogTitle>
          <DialogDescription>
            Move cash between two accounts. A journal entry will be posted
            automatically.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit}>
          <FieldGroup className="gap-4">
            <Field>
              <FieldLabel>From Account</FieldLabel>
              {isLoading ? (
                <Spinner className="size-4" />
              ) : (
                <Select
                  value={fromAccountId}
                  onValueChange={(v) => {
                    setFromAccountId(v)
                    if (v === toAccountId) setToAccountId('')
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select source account…" />
                  </SelectTrigger>
                  <SelectContent>
                    {accounts.map((a) => (
                      <SelectItem key={a.id} value={a.id}>
                        {a.code} · {a.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </Field>

            <Field>
              <FieldLabel>To Account</FieldLabel>
              {isLoading ? (
                <Spinner className="size-4" />
              ) : (
                <Select
                  value={toAccountId}
                  onValueChange={setToAccountId}
                  disabled={!fromAccountId}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select destination account…" />
                  </SelectTrigger>
                  <SelectContent>
                    {toOptions.map((a) => (
                      <SelectItem key={a.id} value={a.id}>
                        {a.code} · {a.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </Field>

            <Field>
              <FieldLabel>Amount</FieldLabel>
              <Input
                type="number"
                min="0.01"
                step="0.01"
                placeholder="0.00"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                disabled={pending}
              />
            </Field>

            <Field>
              <FieldLabel>Date</FieldLabel>
              <Input
                type="date"
                value={transferDate}
                onChange={(e) => setTransferDate(e.target.value)}
                disabled={pending}
              />
            </Field>

            <Field>
              <FieldLabel>Reason (optional)</FieldLabel>
              <Input
                placeholder="e.g. End-of-day sweep"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                disabled={pending}
              />
            </Field>
          </FieldGroup>

          {error && <FieldError className="mt-3">{error}</FieldError>}

          <DialogFooter className="mt-6">
            <DialogClose asChild>
              <Button type="button" variant="outline" disabled={pending}>
                Cancel
              </Button>
            </DialogClose>
            <Button type="submit" disabled={pending} className="min-w-28">
              {pending && <Spinner data-icon="inline-start" />}
              Transfer
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
