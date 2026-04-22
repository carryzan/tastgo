'use client'

import { useState, useTransition } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useKitchen } from '@/hooks/use-kitchen'
import {
  unallocateCredit,
  reverseCreditNote,
  reverseCreditRefund,
} from '../_lib/credit-note-actions'
import { CREDIT_NOTES_QUERY_KEY, PURCHASES_QUERY_KEY } from '../_lib/queries'
import {
  fetchCreditNoteAllocations,
  fetchCreditNoteRefunds,
  fetchSupplierCreditOpenAmount,
} from '../_lib/client-queries'
import type {
  SupplierCreditNote,
  CreditNoteStatus,
  CreditNoteOriginType,
} from './credit-note-columns'
import { AllocateCreditDialog } from './allocate-credit-dialog'
import { RefundCreditDialog } from './refund-credit-dialog'
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

interface CreditNoteDetailSheetProps {
  creditNote: SupplierCreditNote
  open: boolean
  onOpenChange: (open: boolean) => void
}

const STATUS_VARIANTS: Record<CreditNoteStatus, 'default' | 'secondary' | 'outline' | 'destructive'> = {
  open: 'outline',
  partially_settled: 'secondary',
  settled: 'default',
  reversed: 'destructive',
}

const STATUS_LABELS: Record<CreditNoteStatus, string> = {
  open: 'Open',
  partially_settled: 'Partial',
  settled: 'Settled',
  reversed: 'Reversed',
}

const ORIGIN_LABELS: Record<CreditNoteOriginType, string> = {
  supplier_return: 'Return',
  manual: 'Manual',
}

function formatAmount(value: string | number) {
  const n = typeof value === 'string' ? Number(value) : value
  if (Number.isNaN(n)) return '—'
  return n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

export function CreditNoteDetailSheet({
  creditNote,
  open,
  onOpenChange,
}: CreditNoteDetailSheetProps) {
  const { kitchen } = useKitchen()
  const queryClient = useQueryClient()

  const [allocateOpen, setAllocateOpen] = useState(false)
  const [refundOpen, setRefundOpen] = useState(false)
  const [reverseNoteOpen, setReverseNoteOpen] = useState(false)
  const [reverseRefundId, setReverseRefundId] = useState<string | null>(null)
  const [unallocateTarget, setUnallocateTarget] = useState<string | null>(null)
  const [reason, setReason] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()

  const { data: allocations, isLoading: allocsLoading } = useQuery({
    queryKey: ['credit-note-allocations', creditNote.id],
    queryFn: () => fetchCreditNoteAllocations(creditNote.id),
    enabled: open,
  })

  const { data: refunds, isLoading: refundsLoading } = useQuery({
    queryKey: ['credit-note-refunds', creditNote.id],
    queryFn: () => fetchCreditNoteRefunds(creditNote.id),
    enabled: open,
  })

  const { data: openCreditAmount, isLoading: openCreditLoading } = useQuery({
    queryKey: ['supplier-credit-open', creditNote.id],
    queryFn: () => fetchSupplierCreditOpenAmount(creditNote.id),
    enabled: open,
  })

  function invalidate() {
    queryClient.invalidateQueries({ queryKey: CREDIT_NOTES_QUERY_KEY })
    queryClient.invalidateQueries({ queryKey: PURCHASES_QUERY_KEY })
    queryClient.invalidateQueries({ queryKey: ['credit-note-allocations', creditNote.id] })
    queryClient.invalidateQueries({ queryKey: ['credit-note-refunds', creditNote.id] })
    queryClient.invalidateQueries({ queryKey: ['supplier-credit-open', creditNote.id] })
  }

  function handleUnallocate() {
    if (!unallocateTarget) return
    setError(null)
    startTransition(async () => {
      const res = await unallocateCredit(kitchen.id, unallocateTarget, reason || 'Voided')
      if (res instanceof Error) return setError(res.message)
      setUnallocateTarget(null)
      setReason('')
      invalidate()
    })
  }

  function handleReverseNote() {
    if (!reason.trim()) return setError('Enter a reason for reversal.')
    setError(null)
    startTransition(async () => {
      const res = await reverseCreditNote(kitchen.id, creditNote.id, reason)
      if (res instanceof Error) return setError(res.message)
      setReverseNoteOpen(false)
      setReason('')
      invalidate()
      onOpenChange(false)
    })
  }

  function handleReverseRefund() {
    if (!reverseRefundId) return
    if (!reason.trim()) return setError('Enter a reason for reversal.')
    setError(null)
    startTransition(async () => {
      const res = await reverseCreditRefund(kitchen.id, reverseRefundId, reason)
      if (res instanceof Error) return setError(res.message)
      setReverseRefundId(null)
      setReason('')
      invalidate()
    })
  }

  const canAllocate = creditNote.status === 'open' || creditNote.status === 'partially_settled'
  const canRefund = canAllocate
  const canReverse = creditNote.status !== 'reversed'

  return (
    <>
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent className="flex flex-col gap-0 p-0 sm:max-w-xl">
          <SheetHeader className="border-b px-4 py-4">
            <SheetTitle>Credit note</SheetTitle>
            <SheetDescription>
              {creditNote.suppliers?.name ?? '—'} — {ORIGIN_LABELS[creditNote.origin_type]} credit of {formatAmount(creditNote.credit_value)}
            </SheetDescription>
          </SheetHeader>

          <div className="flex min-h-0 flex-1 flex-col overflow-y-auto">
            {/* Header row */}
            <div className="flex flex-wrap items-center gap-3 border-b px-4 py-3">
              <Badge variant={STATUS_VARIANTS[creditNote.status]}>
                {STATUS_LABELS[creditNote.status]}
              </Badge>
              <span className="text-sm text-muted-foreground">
                Source: <span className="font-medium text-foreground">{ORIGIN_LABELS[creditNote.origin_type]}</span>
              </span>
              <span className="text-sm text-muted-foreground">
                Credit: <span className="font-medium text-foreground">{formatAmount(creditNote.credit_value)}</span>
              </span>
              {creditNote.status !== 'reversed' && (
                <span className="text-sm text-muted-foreground">
                  Open credit:{' '}
                  <span className="font-medium text-foreground">
                    {openCreditLoading ? '…' : formatAmount(openCreditAmount ?? 0)}
                  </span>
                </span>
              )}
              {creditNote.offset_account && (
                <span className="text-sm text-muted-foreground">
                  Offset account:{' '}
                  <span className="font-medium text-foreground">
                    {creditNote.offset_account.code} · {creditNote.offset_account.name}
                  </span>
                </span>
              )}
            </div>

            {creditNote.note && (
              <div className="border-b px-4 py-3">
                <p className="text-sm text-muted-foreground">
                  Note: <span className="text-foreground">{creditNote.note}</span>
                </p>
              </div>
            )}

            {/* Allocations */}
            <div className="border-b px-4 py-3">
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
                            {!a.voided_at && canAllocate && (
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

            {/* Refunds */}
            <div className="px-4 py-3">
              <h3 className="mb-2 text-sm font-medium">Refunds</h3>
              {refundsLoading ? (
                <div className="flex justify-center py-4"><Spinner /></div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="pl-0">Amount</TableHead>
                      <TableHead>Account</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead />
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {(refunds ?? []).length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={4} className="pl-0 text-muted-foreground">No refunds yet.</TableCell>
                      </TableRow>
                    ) : (
                      (refunds ?? []).map((r) => (
                        <TableRow key={r.id}>
                          <TableCell className="pl-0">{formatAmount(r.amount)}</TableCell>
                          <TableCell>
                            {r.refund_account ? `${r.refund_account.code} · ${r.refund_account.name}` : '—'}
                          </TableCell>
                          <TableCell>
                            {r.reversed_at ? <Badge variant="outline">Reversed</Badge> : <Badge variant="default">Active</Badge>}
                          </TableCell>
                          <TableCell>
                            {!r.reversed_at && (
                              <Button
                                size="sm"
                                variant="ghost"
                                className="text-destructive hover:text-destructive"
                                onClick={() => { setReverseRefundId(r.id); setReason('') }}
                              >
                                Reverse
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
          <div className="shrink-0 border-t px-4 py-3">
            <div className="flex flex-wrap gap-2">
              {canAllocate && (
                <Button size="sm" onClick={() => setAllocateOpen(true)}>
                  Allocate to purchase
                </Button>
              )}
              {canRefund && (
                <Button size="sm" variant="outline" onClick={() => setRefundOpen(true)}>
                  Refund cash
                </Button>
              )}
              {canReverse && (
                <Button
                  size="sm"
                  variant="outline"
                  className="text-destructive hover:text-destructive"
                  onClick={() => { setReverseNoteOpen(true); setReason('') }}
                >
                  Reverse note
                </Button>
              )}
            </div>
          </div>
        </SheetContent>
      </Sheet>

      {allocateOpen && (
        <AllocateCreditDialog
          creditNote={creditNote}
          open
          onOpenChange={setAllocateOpen}
          onSuccess={invalidate}
        />
      )}

      {refundOpen && (
        <RefundCreditDialog
          creditNote={creditNote}
          open
          onOpenChange={setRefundOpen}
          onSuccess={invalidate}
        />
      )}

      {/* Reverse note dialog */}
      <Dialog open={reverseNoteOpen} onOpenChange={setReverseNoteOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reverse credit note</DialogTitle>
            <DialogDescription>
              This will reverse the credit note journal and supplier ledger effect. This cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <Field>
            <FieldLabel htmlFor="reverse-note-reason">Reason</FieldLabel>
            <Input
              id="reverse-note-reason"
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
              onClick={handleReverseNote}
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
            <FieldLabel htmlFor="void-alloc-reason">Reason (optional)</FieldLabel>
            <Input
              id="void-alloc-reason"
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

      {/* Reverse refund dialog */}
      <Dialog open={!!reverseRefundId} onOpenChange={(o) => { if (!o) setReverseRefundId(null) }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reverse refund</DialogTitle>
            <DialogDescription>Enter a reason for reversing this refund.</DialogDescription>
          </DialogHeader>
          <Field>
            <FieldLabel htmlFor="reverse-refund-reason">Reason</FieldLabel>
            <Input
              id="reverse-refund-reason"
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
              onClick={handleReverseRefund}
              disabled={pending || !reason.trim()}
              className="min-w-28"
            >
              {pending && <Spinner data-icon="inline-start" />}
              Confirm reverse
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
