'use client'

import { useState, useTransition } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useKitchen } from '@/hooks/use-kitchen'
import { unallocatePayment, reversePayment } from '../_lib/payment-actions'
import { PAYMENTS_QUERY_KEY, PURCHASES_QUERY_KEY } from '../_lib/queries'
import {
  fetchPaymentAllocations,
  fetchSupplierPaymentUnallocatedAmount,
} from '../_lib/client-queries'
import type { SupplierPayment } from './payment-columns'
import { AllocatePaymentDialog } from './allocate-payment-dialog'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Spinner } from '@/components/ui/spinner'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Field, FieldError, FieldLabel } from '@/components/ui/field'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/data-table/data-table-primitives'

interface PaymentDetailSheetProps {
  payment: SupplierPayment
  open: boolean
  onOpenChange: (open: boolean) => void
}

function formatAmount(value: string | number) {
  const n = typeof value === 'string' ? Number(value) : value
  if (Number.isNaN(n)) return '—'
  return n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

export function PaymentDetailSheet({
  payment,
  open,
  onOpenChange,
}: PaymentDetailSheetProps) {
  const { kitchen } = useKitchen()
  const queryClient = useQueryClient()

  const [allocateOpen, setAllocateOpen] = useState(false)
  const [reverseOpen, setReverseOpen] = useState(false)
  const [unallocateTarget, setUnallocateTarget] = useState<string | null>(null)
  const [reason, setReason] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()

  const { data: allocations, isLoading: allocsLoading } = useQuery({
    queryKey: ['payment-allocations', payment.id],
    queryFn: () => fetchPaymentAllocations(payment.id),
    enabled: open,
  })

  const { data: unallocatedAmount, isLoading: unallocatedLoading } = useQuery({
    queryKey: ['supplier-payment-unallocated', payment.id],
    queryFn: () => fetchSupplierPaymentUnallocatedAmount(payment.id),
    enabled: open,
  })

  function invalidate() {
    queryClient.invalidateQueries({ queryKey: PAYMENTS_QUERY_KEY })
    queryClient.invalidateQueries({ queryKey: PURCHASES_QUERY_KEY })
    queryClient.invalidateQueries({ queryKey: ['payment-allocations', payment.id] })
    queryClient.invalidateQueries({ queryKey: ['supplier-payment-unallocated', payment.id] })
  }

  function handleUnallocate() {
    if (!unallocateTarget) return
    setError(null)
    startTransition(async () => {
      const res = await unallocatePayment(kitchen.id, unallocateTarget, reason || 'Voided')
      if (res instanceof Error) return setError(res.message)
      setUnallocateTarget(null)
      setReason('')
      invalidate()
    })
  }

  function handleReverse() {
    if (!reason.trim()) return setError('Enter a reason for reversal.')
    setError(null)
    startTransition(async () => {
      const res = await reversePayment(kitchen.id, payment.id, reason)
      if (res instanceof Error) return setError(res.message)
      setReverseOpen(false)
      setReason('')
      invalidate()
      onOpenChange(false)
    })
  }

  const isReversed = !!payment.reversed_at
  const totalAlloc = (allocations ?? [])
    .filter((a) => !a.voided_at)
    .reduce((s, a) => s + (typeof a.amount === 'string' ? Number(a.amount) : a.amount), 0)
  const paymentAmt = typeof payment.amount === 'string' ? Number(payment.amount) : payment.amount
  const computedUnallocated = paymentAmt - totalAlloc
  const currentUnallocated = unallocatedAmount ?? computedUnallocated

  return (
    <>
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent className="flex flex-col gap-0 p-0 sm:max-w-xl">
          <SheetHeader className="border-b px-4 py-4">
            <SheetTitle>Payment detail</SheetTitle>
            <SheetDescription>
              {payment.suppliers?.name ?? '—'} — {formatAmount(payment.amount)}
            </SheetDescription>
          </SheetHeader>

          <div className="flex min-h-0 flex-1 flex-col overflow-y-auto">
            {/* Header row */}
            <div className="flex flex-wrap items-center gap-3 border-b px-4 py-3">
              {isReversed ? (
                <Badge variant="destructive">Reversed</Badge>
              ) : (
                <Badge variant="default">Active</Badge>
              )}
              <span className="text-sm text-muted-foreground">
                Amount: <span className="font-medium text-foreground">{formatAmount(payment.amount)}</span>
              </span>
              {!isReversed && (
                <span className="text-sm text-muted-foreground">
                  Unallocated:{' '}
                  <span className="font-medium text-foreground">
                    {unallocatedLoading
                      ? '…'
                      : formatAmount(currentUnallocated < 0 ? 0 : currentUnallocated)}
                  </span>
                </span>
              )}
              {payment.settlement_account && (
                <span className="text-sm text-muted-foreground">
                  Account: <span className="font-medium text-foreground">{payment.settlement_account.code} · {payment.settlement_account.name}</span>
                </span>
              )}
            </div>

            {/* Allocations */}
            <div className="px-4 py-3">
              <h3 className="mb-2 text-sm font-medium">Allocations</h3>
              {allocsLoading ? (
                <div className="flex justify-center py-4"><Spinner /></div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="pl-0">Purchase</TableHead>
                      <TableHead>Amount</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead />
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {(allocations ?? []).length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={4} className="pl-0 text-muted-foreground">No allocations yet.</TableCell>
                      </TableRow>
                    ) : (
                      (allocations ?? []).map((a) => (
                        <TableRow key={a.id}>
                          <TableCell className="pl-0">
                            {a.purchases ? `#${a.purchases.purchase_number}` : '—'}
                          </TableCell>
                          <TableCell>{formatAmount(a.amount)}</TableCell>
                          <TableCell>
                            {a.voided_at ? <Badge variant="outline">Voided</Badge> : <Badge variant="default">Active</Badge>}
                          </TableCell>
                          <TableCell>
                            {!a.voided_at && !isReversed && (
                              <Button
                                size="sm"
                                variant="ghost"
                                className="text-destructive hover:text-destructive"
                                onClick={() => { setUnallocateTarget(a.id); setReason('') }}
                              >
                                Void
                              </Button>
                            )}
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              )}
            </div>
          </div>

          {/* Actions */}
          {!isReversed && (
            <div className="shrink-0 border-t px-4 py-3">
              <div className="flex flex-wrap gap-2">
                <Button size="sm" onClick={() => setAllocateOpen(true)}>
                  Allocate to purchase
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="text-destructive hover:text-destructive"
                  onClick={() => { setReverseOpen(true); setReason('') }}
                >
                  Reverse payment
                </Button>
              </div>
            </div>
          )}
        </SheetContent>
      </Sheet>

      {allocateOpen && (
        <AllocatePaymentDialog
          payment={payment}
          open
          onOpenChange={setAllocateOpen}
          onSuccess={invalidate}
        />
      )}

      {/* Reverse payment dialog */}
      <Dialog open={reverseOpen} onOpenChange={setReverseOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reverse payment</DialogTitle>
            <DialogDescription>
              This will reverse the payment of {formatAmount(payment.amount)} and post a compensating ledger entry.
            </DialogDescription>
          </DialogHeader>
          <Field>
            <FieldLabel htmlFor="reverse-pay-reason">Reason</FieldLabel>
            <Input
              id="reverse-pay-reason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Enter reason"
              disabled={pending}
            />
          </Field>
          {error && <FieldError>{error}</FieldError>}
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="outline" disabled={pending}>Cancel</Button>
            </DialogClose>
            <Button
              variant="destructive"
              onClick={handleReverse}
              disabled={pending || !reason.trim()}
              className="min-w-28"
            >
              {pending && <Spinner data-icon="inline-start" />}
              Confirm reverse
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Void allocation dialog */}
      <Dialog open={!!unallocateTarget} onOpenChange={(o) => { if (!o) setUnallocateTarget(null) }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Void allocation</DialogTitle>
            <DialogDescription>Enter an optional reason for voiding this allocation.</DialogDescription>
          </DialogHeader>
          <Field>
            <FieldLabel htmlFor="void-pay-alloc-reason">Reason (optional)</FieldLabel>
            <Input
              id="void-pay-alloc-reason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Enter reason"
              disabled={pending}
            />
          </Field>
          {error && <FieldError>{error}</FieldError>}
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="outline" disabled={pending}>Cancel</Button>
            </DialogClose>
            <Button
              variant="destructive"
              onClick={handleUnallocate}
              disabled={pending}
              className="min-w-28"
            >
              {pending && <Spinner data-icon="inline-start" />}
              Void
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
