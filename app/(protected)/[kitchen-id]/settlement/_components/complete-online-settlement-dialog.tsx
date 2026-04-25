'use client'

import { useState, useTransition } from 'react'
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
  Field,
  FieldError,
  FieldGroup,
  FieldLabel,
} from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Spinner } from '@/components/ui/spinner'
import { completeOnlineSettlement } from '../_lib/actions'
import { fetchSettlementAccounts } from '../_lib/client-queries'

interface CompleteOnlineSettlementDialogProps {
  kitchenId: string
  settlementId: string
  expectedPayout: string | number
  open: boolean
  onOpenChange: (open: boolean) => void
  onCompleted: () => void
}

export function CompleteOnlineSettlementDialog({
  kitchenId,
  settlementId,
  expectedPayout,
  open,
  onOpenChange,
  onCompleted,
}: CompleteOnlineSettlementDialogProps) {
  const [actualDeposit, setActualDeposit] = useState(String(expectedPayout))
  const [settlementAccountId, setSettlementAccountId] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()

  const { data: accounts = [], isLoading } = useQuery({
    queryKey: ['settlement-accounts', kitchenId],
    queryFn: () => fetchSettlementAccounts(kitchenId),
    enabled: open,
  })

  function handleOpenChange(next: boolean) {
    if (pending) return
    onOpenChange(next)
    if (!next) {
      setActualDeposit(String(expectedPayout))
      setSettlementAccountId('')
      setError(null)
    }
  }

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError(null)

    const amount = Number(actualDeposit)
    if (Number.isNaN(amount) || amount < 0) {
      setError('Actual deposit must be zero or greater.')
      return
    }
    if (!settlementAccountId) {
      setError('Select the account that received the deposit.')
      return
    }

    startTransition(async () => {
      const result = await completeOnlineSettlement(
        kitchenId,
        settlementId,
        amount,
        settlementAccountId
      )
      if (result instanceof Error) {
        setError(result.message)
        return
      }

      handleOpenChange(false)
      onCompleted()
    })
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Complete settlement</DialogTitle>
          <DialogDescription>
            Post the platform deposit, fees, variance, and receivable clearing entry.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit}>
          <FieldGroup className="gap-4">
            <Field>
              <FieldLabel htmlFor="actual-deposit">Actual Deposit</FieldLabel>
              <Input
                id="actual-deposit"
                type="number"
                min="0"
                step="0.001"
                value={actualDeposit}
                onChange={(event) => setActualDeposit(event.target.value)}
                disabled={pending}
              />
            </Field>

            <Field>
              <FieldLabel>Settlement Account</FieldLabel>
              {isLoading ? (
                <Spinner className="size-4" />
              ) : (
                <Select
                  value={settlementAccountId}
                  onValueChange={setSettlementAccountId}
                  disabled={pending}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select deposit account" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectGroup>
                      {accounts.map((account) => (
                        <SelectItem key={account.id} value={account.id}>
                          {account.code} - {account.name}
                        </SelectItem>
                      ))}
                    </SelectGroup>
                  </SelectContent>
                </Select>
              )}
            </Field>
          </FieldGroup>

          {error ? <FieldError className="mt-4">{error}</FieldError> : null}

          <DialogFooter className="mt-6">
            <DialogClose asChild>
              <Button type="button" variant="outline" disabled={pending}>
                Cancel
              </Button>
            </DialogClose>
            <Button type="submit" disabled={pending} className="min-w-28">
              {pending ? <Spinner data-icon="inline-start" /> : null}
              Complete
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
