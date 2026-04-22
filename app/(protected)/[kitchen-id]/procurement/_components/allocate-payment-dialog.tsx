'use client'

import { useState, useTransition } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useKitchen } from '@/hooks/use-kitchen'
import { allocatePayment } from '../_lib/payment-actions'
import {
  fetchPurchaseOpenBalance,
  fetchReceivedPurchasesForSupplier,
  fetchSupplierPaymentUnallocatedAmount,
} from '../_lib/client-queries'
import type { SupplierPayment } from './payment-columns'
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

interface AllocatePaymentDialogProps {
  payment: SupplierPayment
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess: () => void
}

function formatAmount(value: string | number) {
  const n = typeof value === 'string' ? Number(value) : value
  if (Number.isNaN(n)) return '—'
  return n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

export function AllocatePaymentDialog({
  payment,
  open,
  onOpenChange,
  onSuccess,
}: AllocatePaymentDialogProps) {
  const { kitchen } = useKitchen()
  const [purchaseId, setPurchaseId] = useState('')
  const [amount, setAmount] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()

  const { data: purchases } = useQuery({
    queryKey: ['received-purchases', kitchen.id, payment.supplier_id],
    queryFn: () => fetchReceivedPurchasesForSupplier(kitchen.id, payment.supplier_id),
    enabled: open,
  })

  const {
    data: unallocatedAmount,
    isLoading: unallocatedLoading,
  } = useQuery({
    queryKey: ['supplier-payment-unallocated', payment.id],
    queryFn: () => fetchSupplierPaymentUnallocatedAmount(payment.id),
    enabled: open,
  })

  const {
    data: purchaseOpenBalance,
    isLoading: purchaseOpenLoading,
  } = useQuery({
    queryKey: ['purchase-open-balance', purchaseId],
    queryFn: () => fetchPurchaseOpenBalance(purchaseId),
    enabled: open && !!purchaseId,
  })

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)

    if (!purchaseId) return setError('Select a purchase.')
    const amt = Number(amount)
    if (!amount || Number.isNaN(amt) || amt <= 0)
      return setError('Enter a valid amount.')
    if (unallocatedAmount != null && amt > unallocatedAmount + 0.001) {
      return setError(
        `Amount exceeds payment unallocated amount (${formatAmount(unallocatedAmount)}).`
      )
    }
    if (purchaseOpenBalance != null && amt > purchaseOpenBalance + 0.001) {
      return setError(
        `Amount exceeds purchase open balance (${formatAmount(purchaseOpenBalance)}).`
      )
    }

    startTransition(async () => {
      try {
        const res = await allocatePayment(kitchen.id, payment.id, [
          { purchase_id: purchaseId, amount: amt },
        ])
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
          <DialogTitle>Allocate payment to purchase</DialogTitle>
          <DialogDescription>
            Allocate part or all of the supplier payment from{' '}
            {payment.suppliers?.name ?? 'supplier'} to a received purchase.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <Field>
            <FieldLabel>Purchase</FieldLabel>
            <Select value={purchaseId} onValueChange={setPurchaseId} disabled={pending}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select purchase" />
              </SelectTrigger>
              <SelectContent>
                {(purchases ?? []).map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    #{p.purchase_number}
                    {p.supplier_invoice_code ? ` — ${p.supplier_invoice_code}` : ''}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {purchaseId && (
              <p className="mt-2 text-sm text-muted-foreground">
                Purchase open balance:{' '}
                <span className="font-medium text-foreground">
                  {purchaseOpenLoading ? '…' : formatAmount(purchaseOpenBalance ?? 0)}
                </span>
              </p>
            )}
          </Field>
          <Field>
            <FieldLabel htmlFor="pay-alloc-amount">Amount</FieldLabel>
            <Input
              id="pay-alloc-amount"
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
              Payment unallocated:{' '}
              <span className="font-medium text-foreground">
                {unallocatedLoading ? '…' : formatAmount(unallocatedAmount ?? 0)}
              </span>
            </p>
          </Field>
          {error && <FieldError>{error}</FieldError>}
          <DialogFooter>
            <DialogClose asChild>
              <Button type="button" variant="outline" disabled={pending}>Cancel</Button>
            </DialogClose>
            <Button
              type="submit"
              disabled={pending || unallocatedLoading || (purchaseId !== '' && purchaseOpenLoading)}
              className="min-w-28"
            >
              {pending && <Spinner data-icon="inline-start" />}
              Allocate
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
