'use client'

import { useQuery } from '@tanstack/react-query'
import {
  fetchPurchaseCreditSettlements,
  fetchPurchaseOpenBalance,
  fetchPurchasePaymentSettlements,
} from '../_lib/client-queries'
import type { Purchase } from './purchase-columns'
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
  const { data: openBalance, isLoading: balanceLoading } = useQuery({
    queryKey: ['purchase-open-balance', purchase.id],
    queryFn: () => fetchPurchaseOpenBalance(purchase.id),
    enabled: open,
  })

  const { data: paymentSettlements, isLoading: paymentSettlementsLoading } = useQuery({
    queryKey: ['purchase-payment-settlements', purchase.id],
    queryFn: () => fetchPurchasePaymentSettlements(purchase.id),
    enabled: open,
  })

  const { data: creditSettlements, isLoading: creditSettlementsLoading } = useQuery({
    queryKey: ['purchase-credit-settlements', purchase.id],
    queryFn: () => fetchPurchaseCreditSettlements(purchase.id),
    enabled: open,
  })

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="flex flex-col gap-0 p-0 sm:max-w-xl">
        <SheetHeader className="px-4 pb-4 pt-4">
          <SheetTitle>Purchase settlements</SheetTitle>
          <SheetDescription>
            Purchase #{purchase.purchase_number} — {purchase.suppliers?.name ?? ''}
          </SheetDescription>
        </SheetHeader>

        <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
          <div className="border-b px-4 py-3">
            <div className="flex flex-wrap items-center gap-3">
              <span className="text-sm text-muted-foreground">
                Open balance:{' '}
                <span className="font-medium text-foreground">
                  {balanceLoading ? '…' : formatAmount(openBalance ?? 0)}
                </span>
              </span>
              <span className="text-sm text-muted-foreground">
                Payment allocations:{' '}
                <span className="font-medium text-foreground">
                  {paymentSettlements?.length ?? 0}
                </span>
              </span>
              <span className="text-sm text-muted-foreground">
                Credit allocations:{' '}
                <span className="font-medium text-foreground">
                  {creditSettlements?.length ?? 0}
                </span>
              </span>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto">
            <div className="border-b px-4 py-3">
              <h3 className="mb-2 text-sm font-medium">Payment allocations</h3>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="pl-0">Allocated amount</TableHead>
                    <TableHead>Payment total</TableHead>
                    <TableHead>Settlement account</TableHead>
                    <TableHead>Paid by</TableHead>
                    <TableHead>Date</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paymentSettlementsLoading ? (
                    <TableRow>
                      <TableCell colSpan={5} className="h-12 text-center">
                        <Spinner />
                      </TableCell>
                    </TableRow>
                  ) : (paymentSettlements ?? []).length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="h-16 pl-0 text-muted-foreground">
                        No payment allocations yet.
                      </TableCell>
                    </TableRow>
                  ) : (
                    (paymentSettlements ?? []).map((settlement) => (
                      <TableRow key={settlement.id}>
                        <TableCell className="pl-0 font-medium">
                          {formatAmount(settlement.amount)}
                        </TableCell>
                        <TableCell>
                          {settlement.payment ? formatAmount(settlement.payment.amount) : '—'}
                        </TableCell>
                        <TableCell>
                          {settlement.payment?.settlement_account
                            ? `${settlement.payment.settlement_account.code} · ${settlement.payment.settlement_account.name}`
                            : '—'}
                        </TableCell>
                        <TableCell>
                          {settlement.payment?.paid_member?.profiles?.full_name ?? '—'}
                        </TableCell>
                        <TableCell>
                          {settlement.payment
                            ? new Date(settlement.payment.created_at).toLocaleDateString('en-US', {
                                month: 'short',
                                day: 'numeric',
                                year: 'numeric',
                              })
                            : '—'}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>

            <div className="px-4 py-3">
              <h3 className="mb-2 text-sm font-medium">Credit allocations</h3>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="pl-0">Allocated amount</TableHead>
                    <TableHead>Credit value</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Date</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {creditSettlementsLoading ? (
                    <TableRow>
                      <TableCell colSpan={4} className="h-12 text-center">
                        <Spinner />
                      </TableCell>
                    </TableRow>
                  ) : (creditSettlements ?? []).length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={4} className="h-16 pl-0 text-muted-foreground">
                        No credit allocations yet.
                      </TableCell>
                    </TableRow>
                  ) : (
                    (creditSettlements ?? []).map((settlement) => (
                      <TableRow key={settlement.id}>
                        <TableCell className="pl-0 font-medium">
                          {formatAmount(settlement.amount)}
                        </TableCell>
                        <TableCell>
                          {settlement.credit_note ? formatAmount(settlement.credit_note.credit_value) : '—'}
                        </TableCell>
                        <TableCell>
                          {settlement.credit_note ? (
                            <Badge variant={settlement.credit_note.status === 'settled' ? 'default' : 'secondary'}>
                              {settlement.credit_note.status.replace('_', ' ')}
                            </Badge>
                          ) : (
                            '—'
                          )}
                        </TableCell>
                        <TableCell>
                          {settlement.credit_note
                            ? new Date(settlement.credit_note.created_at).toLocaleDateString('en-US', {
                                month: 'short',
                                day: 'numeric',
                                year: 'numeric',
                              })
                            : '—'}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  )
}
