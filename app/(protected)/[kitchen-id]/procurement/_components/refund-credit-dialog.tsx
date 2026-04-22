'use client'

import { useState, useTransition } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useKitchen } from '@/hooks/use-kitchen'
import { refundCredit } from '../_lib/credit-note-actions'
import {
  fetchActiveCashAccounts,
  fetchSupplierCreditOpenAmount,
} from '../_lib/client-queries'
import type { SupplierCreditNote } from './credit-note-columns'
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
import { Field, FieldError, FieldLabel } from '@/components/ui/field'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

interface RefundCreditDialogProps {
  creditNote: SupplierCreditNote
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess: () => void
}

function formatAmount(value: string | number) {
  const n = typeof value === 'string' ? Number(value) : value
  if (Number.isNaN(n)) return '—'
  return n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

export function RefundCreditDialog({
  creditNote,
  open,
  onOpenChange,
  onSuccess,
}: RefundCreditDialogProps) {
  const { kitchen } = useKitchen()
  const [accountId, setAccountId] = useState('')
  const [amount, setAmount] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()

  const { data: cashAccounts } = useQuery({
    queryKey: ['active-cash-accounts', kitchen.id],
    queryFn: () => fetchActiveCashAccounts(kitchen.id),
    enabled: open,
  })

  const { data: openCreditAmount, isLoading: openCreditLoading } = useQuery({
    queryKey: ['supplier-credit-open', creditNote.id],
    queryFn: () => fetchSupplierCreditOpenAmount(creditNote.id),
    enabled: open,
  })

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)

    if (!accountId) return setError('Select a settlement account.')
    const amt = Number(amount)
    if (!amount || Number.isNaN(amt) || amt <= 0)
      return setError('Enter a valid amount.')
    if (openCreditAmount != null && amt > openCreditAmount + 0.001) {
      return setError(`Amount exceeds open credit (${formatAmount(openCreditAmount)}).`)
    }

    startTransition(async () => {
      try {
        const res = await refundCredit(kitchen.id, creditNote.id, accountId, amt)
        if (res instanceof Error) return setError(res.message)
        onOpenChange(false)
        onSuccess()
      } catch {
        setError('Something went wrong. Please try again.')
      }
    })
  }

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!pending) onOpenChange(o) }}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Cash refund</DialogTitle>
          <DialogDescription>
            Refund part or all of the remaining open credit (
            {openCreditLoading ? '…' : formatAmount(openCreditAmount ?? 0)}) as cash to a
            settlement account.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <Field>
            <FieldLabel htmlFor="refund-amount">Amount</FieldLabel>
            <Input
              id="refund-amount"
              type="number"
              inputMode="decimal"
              min="0.01"
              step="0.01"
              placeholder="0.00"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              disabled={pending}
            />
            <p className="mt-2 text-sm text-muted-foreground">
              Open credit:{' '}
              <span className="font-medium text-foreground">
                {openCreditLoading ? '…' : formatAmount(openCreditAmount ?? 0)}
              </span>
            </p>
          </Field>
          <Field>
            <FieldLabel>Settlement account</FieldLabel>
            <Select value={accountId} onValueChange={setAccountId} disabled={pending}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select account" />
              </SelectTrigger>
              <SelectContent>
                {(cashAccounts ?? []).map((a) => (
                  <SelectItem key={a.id} value={a.id}>
                    {a.code} · {a.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
          {error && <FieldError>{error}</FieldError>}
          <DialogFooter>
            <DialogClose asChild>
              <Button type="button" variant="outline" disabled={pending}>Cancel</Button>
            </DialogClose>
            <Button
              type="submit"
              disabled={pending || openCreditLoading}
              className="min-w-28"
            >
              {pending && <Spinner data-icon="inline-start" />}
              Refund
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
