'use client'

import { useState, useTransition } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useKitchen } from '@/hooks/use-kitchen'
import { createCashAccountTransaction } from '../_lib/cash-account-actions'
import {
  CASH_ACCOUNTS_QUERY_KEY,
  CASH_TRANSACTIONS_QUERY_KEY,
} from '../_lib/queries'
import { fetchActiveCashAccounts } from '../_lib/client-queries'
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Field,
  FieldError,
  FieldGroup,
  FieldLabel,
} from '@/components/ui/field'

interface AddCashTransactionDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

type TransactionType = 'deposit' | 'withdrawal' | 'transfer'

const TYPE_LABELS: Record<TransactionType, string> = {
  deposit: 'Deposit',
  withdrawal: 'Withdrawal',
  transfer: 'Transfer',
}

export function AddCashTransactionDialog({
  open,
  onOpenChange,
}: AddCashTransactionDialogProps) {
  const { kitchen, membership } = useKitchen()
  const queryClient = useQueryClient()
  const [txType, setTxType] = useState<TransactionType>('deposit')
  const [accountId, setAccountId] = useState<string>('')
  const [transferToId, setTransferToId] = useState<string>('')
  const [error, setError] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()

  const { data: accounts } = useQuery({
    queryKey: ['active-cash-accounts', kitchen.id],
    queryFn: () => fetchActiveCashAccounts(kitchen.id),
    enabled: open,
  })

  const otherAccounts = accounts?.filter((a) => a.id !== accountId) ?? []

  function handleOpenChange(next: boolean) {
    if (pending) return
    onOpenChange(next)
    if (!next) {
      setTxType('deposit')
      setAccountId('')
      setTransferToId('')
      setError(null)
    }
  }

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(null)

    const form = e.currentTarget
    const fd = new FormData(form)
    const amountRaw = (fd.get('amount') as string)?.trim()
    const reason = (fd.get('reason') as string)?.trim() || undefined

    if (!accountId) return setError('Select an account.')

    const amount = Number.parseFloat(amountRaw ?? '')
    if (Number.isNaN(amount) || amount <= 0) {
      return setError('Enter a valid amount greater than 0.')
    }

    if (txType === 'transfer' && !transferToId) {
      return setError('Select a destination account for the transfer.')
    }

    startTransition(async () => {
      try {
        const result = await createCashAccountTransaction(kitchen.id, {
          cash_account_id: accountId,
          type: txType,
          amount,
          reason,
          transfer_to_account_id:
            txType === 'transfer' ? transferToId : undefined,
          membership_id: membership.id as string,
        })
        if (result instanceof Error) return setError(result.message)

        form.reset()
        setTxType('deposit')
        setAccountId('')
        setTransferToId('')
        onOpenChange(false)
        queryClient.invalidateQueries({ queryKey: CASH_TRANSACTIONS_QUERY_KEY })
        queryClient.invalidateQueries({ queryKey: CASH_ACCOUNTS_QUERY_KEY })
      } catch {
        setError('Something went wrong. Please try again.')
      }
    })
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent
        onInteractOutside={(e) => {
          if (pending) e.preventDefault()
        }}
        onEscapeKeyDown={(e) => {
          if (pending) e.preventDefault()
        }}
      >
        <DialogHeader>
          <DialogTitle>Add transaction</DialogTitle>
          <DialogDescription>
            Record a manual deposit, withdrawal, or transfer between cash accounts.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <FieldGroup>
            <Field>
              <FieldLabel>Account</FieldLabel>
              <Select
                value={accountId}
                onValueChange={(v) => {
                  setAccountId(v)
                  setTransferToId('')
                  setError(null)
                }}
                disabled={pending || !accounts || accounts.length === 0}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select account" />
                </SelectTrigger>
                <SelectContent className="z-100">
                  {accounts?.length === 0 ? (
                    <SelectItem value="__none" disabled>
                      No active accounts
                    </SelectItem>
                  ) : (
                    accounts?.map((a) => (
                      <SelectItem key={a.id} value={a.id}>
                        {a.name}
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </Field>

            <Field>
              <FieldLabel>Type</FieldLabel>
              <Select
                value={txType}
                onValueChange={(v) => {
                  setTxType(v as TransactionType)
                  setTransferToId('')
                  setError(null)
                }}
                disabled={pending}
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="z-100">
                  {(Object.keys(TYPE_LABELS) as TransactionType[]).map((t) => (
                    <SelectItem key={t} value={t}>
                      {TYPE_LABELS[t]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>

            {txType === 'transfer' && (
              <Field>
                <FieldLabel>Destination Account</FieldLabel>
                <Select
                  value={transferToId}
                  onValueChange={setTransferToId}
                  disabled={pending || otherAccounts.length === 0}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select account" />
                  </SelectTrigger>
                  <SelectContent className="z-100">
                    {otherAccounts.length === 0 ? (
                      <SelectItem value="__none" disabled>
                        No other accounts
                      </SelectItem>
                    ) : (
                      otherAccounts.map((a) => (
                        <SelectItem key={a.id} value={a.id}>
                          {a.name}
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
              </Field>
            )}

            <Field>
              <FieldLabel htmlFor="add-tx-amount">Amount</FieldLabel>
              <Input
                id="add-tx-amount"
                name="amount"
                type="text"
                inputMode="decimal"
                placeholder="0.000"
                required
                disabled={pending}
              />
            </Field>

            <Field>
              <FieldLabel htmlFor="add-tx-reason">Reason (optional)</FieldLabel>
              <Input
                id="add-tx-reason"
                name="reason"
                placeholder="e.g. End of day deposit"
                disabled={pending}
              />
            </Field>
          </FieldGroup>

          {error && <FieldError className="mt-2">{error}</FieldError>}

          <DialogFooter className="mt-4">
            <DialogClose asChild>
              <Button type="button" variant="outline" disabled={pending}>
                Cancel
              </Button>
            </DialogClose>
            <Button type="submit" disabled={pending} className="min-w-28">
              {pending && <Spinner data-icon="inline-start" />}
              Record transaction
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
