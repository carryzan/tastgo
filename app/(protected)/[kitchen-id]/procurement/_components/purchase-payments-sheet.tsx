'use client'

import { useState, useTransition } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useKitchen } from '@/hooks/use-kitchen'
import { createSupplierPayment } from '../_lib/payment-actions'
import { PAYMENTS_QUERY_KEY } from '../_lib/queries'
import {
  fetchPurchasePayments,
  fetchActiveCashAccounts,
} from '../_lib/client-queries'
import type { Purchase } from './purchase-columns'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Spinner } from '@/components/ui/spinner'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/data-table/data-table-primitives'

interface PurchasePaymentsSheetProps {
  purchase: Purchase
  open: boolean
  onOpenChange: (open: boolean) => void
}

function formatAmount(value: string | number) {
  const n = typeof value === 'string' ? Number(value) : value
  if (Number.isNaN(n)) return '—'
  return n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

export function PurchasePaymentsSheet({
  purchase,
  open,
  onOpenChange,
}: PurchasePaymentsSheetProps) {
  const { kitchen, membership } = useKitchen()
  const queryClient = useQueryClient()
  const [cashAccountId, setCashAccountId] = useState('')
  const [amount, setAmount] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()

  const { data: payments, isLoading: paymentsLoading } = useQuery({
    queryKey: ['purchase-payments', purchase.id],
    queryFn: () => fetchPurchasePayments(purchase.id),
    enabled: open,
  })

  const { data: cashAccounts } = useQuery({
    queryKey: ['active-cash-accounts', kitchen.id],
    queryFn: () => fetchActiveCashAccounts(kitchen.id),
    enabled: open,
  })

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(null)

    const amt = Number(amount)
    if (!amount || Number.isNaN(amt) || amt <= 0)
      return setError('Enter a valid payment amount.')
    if (!cashAccountId) return setError('Select a cash account.')

    startTransition(async () => {
      try {
        const result = await createSupplierPayment({
          kitchen_id: kitchen.id,
          purchase_id: purchase.id,
          supplier_id: purchase.supplier_id,
          amount: amt,
          cash_account_id: cashAccountId,
          paid_by: membership.id,
        })
        if (result instanceof Error) return setError(result.message)
        setAmount('')
        setCashAccountId('')
        queryClient.invalidateQueries({ queryKey: ['purchase-payments', purchase.id] })
        queryClient.invalidateQueries({ queryKey: PAYMENTS_QUERY_KEY })
      } catch {
        setError('Something went wrong. Please try again.')
      }
    })
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="flex flex-col gap-0 p-0 sm:max-w-xl">
        <SheetHeader className="px-4 pb-4 pt-4">
          <SheetTitle>Payments</SheetTitle>
          <SheetDescription>
            Purchase #{purchase.purchase_number} — {purchase.suppliers?.name ?? ''}
          </SheetDescription>
        </SheetHeader>

        <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
          <div className="flex-1 overflow-y-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="pl-4">Amount</TableHead>
                  <TableHead>Cash account</TableHead>
                  <TableHead>Paid by</TableHead>
                  <TableHead>Date</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paymentsLoading ? (
                  <TableRow>
                    <TableCell colSpan={4} className="h-12 text-center">
                      <Spinner />
                    </TableCell>
                  </TableRow>
                ) : (payments ?? []).length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={4}
                      className="h-24 text-center text-muted-foreground"
                    >
                      No payments yet.
                    </TableCell>
                  </TableRow>
                ) : (
                  (payments ?? []).map((payment) => (
                    <TableRow key={payment.id}>
                      <TableCell className="pl-4 font-medium">
                        {formatAmount(payment.amount)}
                      </TableCell>
                      <TableCell>{payment.cash_accounts?.name ?? '—'}</TableCell>
                      <TableCell>
                        {payment.paid_member?.profiles?.full_name ?? '—'}
                      </TableCell>
                      <TableCell>
                        {new Date(payment.created_at).toLocaleDateString('en-US', {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric',
                        })}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>

          <div className="shrink-0 border-t px-4 py-4">
            <h3 className="mb-3 text-sm font-medium">Add payment</h3>
            <form onSubmit={handleSubmit} className="flex flex-col gap-3">
              <FieldGroup>
                <Field>
                  <FieldLabel htmlFor="pay-amount">Amount</FieldLabel>
                  <Input
                    id="pay-amount"
                    type="number"
                    inputMode="decimal"
                    min="0.01"
                    step="0.01"
                    placeholder="0.00"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    disabled={pending}
                  />
                </Field>
                <Field>
                  <FieldLabel>Cash account</FieldLabel>
                  <Select value={cashAccountId} onValueChange={setCashAccountId} disabled={pending}>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Select account" />
                    </SelectTrigger>
                    <SelectContent>
                      {(cashAccounts ?? []).map((acc) => (
                        <SelectItem key={acc.id} value={acc.id}>
                          {acc.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </Field>
              </FieldGroup>
              {error && <FieldError>{error}</FieldError>}
              <Button type="submit" disabled={pending} size="sm" className="self-end min-w-28">
                {pending && <Spinner data-icon="inline-start" />}
                Record payment
              </Button>
            </form>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  )
}
