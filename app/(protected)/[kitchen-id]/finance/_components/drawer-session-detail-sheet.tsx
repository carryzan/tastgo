'use client'

import { useState, useTransition } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useKitchen } from '@/hooks/use-kitchen'
import { Spinner } from '@/components/ui/spinner'
import { Separator } from '@/components/ui/separator'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Field,
  FieldError,
  FieldGroup,
  FieldLabel,
} from '@/components/ui/field'
import { MoreHorizontalIcon } from 'lucide-react'
import {
  fetchDrawerSessionTransactions,
  fetchActiveCashAccounts,
  type DrawerTransaction,
  type ChartAccountPick,
} from '../_lib/client-queries'
import {
  addCashIn,
  addCashOut,
  closeDrawerSession,
  reopenDrawerSession,
  undoDrawerTransaction,
} from '../_lib/drawer-actions'
import { DRAWER_SESSIONS_QUERY_KEY } from '../_lib/queries'
import type { DrawerSession } from './drawer-session-columns'

interface DrawerSessionDetailSheetProps {
  session: DrawerSession
  open: boolean
  onOpenChange: (open: boolean) => void
}

const TRANSACTION_TYPE_LABELS: Record<string, string> = {
  cash_in: 'Cash In',
  cash_out: 'Cash Out',
  cash_payment: 'Cash Payment',
  cash_refund: 'Cash Refund',
}

function formatAmount(value: string | number | null) {
  if (value === null || value === undefined) return '—'
  const n = typeof value === 'string' ? Number(value) : value
  if (Number.isNaN(n)) return '—'
  return n.toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 3,
  })
}

function formatDateTime(iso: string | null) {
  if (!iso) return '—'
  return new Date(iso).toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })
}

function StatRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3 py-2">
      <span className="text-sm text-muted-foreground">{label}</span>
      <span className="text-sm font-medium">{value}</span>
    </div>
  )
}

function VarianceDisplay({
  variance,
  varianceType,
}: {
  variance: DrawerSession['variance']
  varianceType: DrawerSession['variance_type']
}) {
  if (variance === null || varianceType === null)
    return <span className="text-sm font-medium">—</span>

  const n = typeof variance === 'string' ? Number(variance) : variance
  const formatted = formatAmount(Math.abs(n))

  const styles = {
    overage: 'text-green-600 dark:text-green-400',
    shortage: 'text-destructive',
    exact: 'text-muted-foreground',
  }

  const labels = {
    overage: `+${formatted} (Overage)`,
    shortage: `-${formatted} (Shortage)`,
    exact: `${formatted} (Exact)`,
  }

  return (
    <span className={`text-sm font-medium ${styles[varianceType]}`}>
      {labels[varianceType]}
    </span>
  )
}

function StatusBadge({ session }: { session: DrawerSession }) {
  const styles = {
    open: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
    closed: 'bg-muted text-muted-foreground',
  }
  return (
    <span className="inline-flex items-center gap-1.5">
      <span
        className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium capitalize ${styles[session.status]}`}
      >
        {session.status}
      </span>
      {session.status === 'open' && session.reopened_at !== null && (
        <span className="inline-flex items-center rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-800 dark:bg-amber-900/30 dark:text-amber-400">
          Reopened
        </span>
      )}
    </span>
  )
}

function AccountSelect({
  accounts,
  value,
  onChange,
  excludeId,
  disabled,
  placeholder,
}: {
  accounts: ChartAccountPick[] | undefined
  value: string
  onChange: (v: string) => void
  excludeId?: string
  disabled?: boolean
  placeholder?: string
}) {
  const filtered = accounts?.filter((a) => a.id !== excludeId) ?? []
  return (
    <Select value={value} onValueChange={onChange} disabled={disabled || !accounts}>
      <SelectTrigger className="w-full">
        <SelectValue placeholder={placeholder ?? 'Select account'} />
      </SelectTrigger>
      <SelectContent>
        {filtered.map((a) => (
          <SelectItem key={a.id} value={a.id}>
            {a.code} · {a.name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}

function DrawerTransactionRow({
  tx,
  sessionIsOpen,
  onUndo,
}: {
  tx: DrawerTransaction
  sessionIsOpen: boolean
  onUndo: (tx: DrawerTransaction) => void
}) {
  const isCredit = tx.type === 'cash_in' || tx.type === 'cash_payment'
  const isUndoable =
    (tx.type === 'cash_in' || tx.type === 'cash_out') &&
    sessionIsOpen

  const accountLabel =
    tx.type === 'cash_in'
      ? tx.source_account
        ? `${tx.source_account.code} · ${tx.source_account.name}`
        : null
      : tx.type === 'cash_out'
        ? tx.destination_account
          ? `${tx.destination_account.code} · ${tx.destination_account.name}`
          : null
        : null

  const isUndone = tx.undone_by_transaction_id !== null

  return (
    <div className="flex items-start justify-between gap-3 py-3">
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className={`text-sm font-medium ${isUndone ? 'line-through text-muted-foreground' : ''}`}>
            {TRANSACTION_TYPE_LABELS[tx.type] ?? tx.type}
          </span>
          {isUndone && (
            <span className="rounded-full bg-muted px-1.5 py-0.5 text-xs text-muted-foreground">
              Undone
            </span>
          )}
        </div>
        {accountLabel && (
          <p className="mt-0.5 text-xs text-muted-foreground">{accountLabel}</p>
        )}
        {tx.reason && (
          <p className="mt-0.5 text-xs text-muted-foreground">{tx.reason}</p>
        )}
        <p className="mt-0.5 text-xs text-muted-foreground">
          {tx.created_member?.profiles?.full_name ?? 'System'} ·{' '}
          {formatDateTime(tx.created_at)}
        </p>
      </div>
      <div className="flex shrink-0 items-center gap-1">
        <span
          className={`text-sm font-medium ${
            isUndone
              ? 'text-muted-foreground line-through'
              : isCredit
                ? 'text-green-600 dark:text-green-400'
                : 'text-muted-foreground'
          }`}
        >
          {formatAmount(tx.amount)}
        </span>
        {isUndoable && !isUndone && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon-xs">
                <MoreHorizontalIcon className="h-3.5 w-3.5" />
                <span className="sr-only">Transaction actions</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" onCloseAutoFocus={(e) => e.preventDefault()}>
              <DropdownMenuItem onClick={() => onUndo(tx)}>
                Undo transaction
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>
    </div>
  )
}

export function DrawerSessionDetailSheet({
  session,
  open,
  onOpenChange,
}: DrawerSessionDetailSheetProps) {
  const { kitchen } = useKitchen()
  const queryClient = useQueryClient()

  // Dialog states
  const [cashInOpen, setCashInOpen] = useState(false)
  const [cashOutOpen, setCashOutOpen] = useState(false)
  const [closeOpen, setCloseOpen] = useState(false)
  const [reopenOpen, setReopenOpen] = useState(false)
  const [undoTarget, setUndoTarget] = useState<DrawerTransaction | null>(null)

  // Form field states
  const [cashInAccountId, setCashInAccountId] = useState('')
  const [cashOutAccountId, setCashOutAccountId] = useState('')

  // Error states
  const [cashInError, setCashInError] = useState<string | null>(null)
  const [cashOutError, setCashOutError] = useState<string | null>(null)
  const [closeError, setCloseError] = useState<string | null>(null)
  const [reopenError, setReopenError] = useState<string | null>(null)
  const [undoError, setUndoError] = useState<string | null>(null)

  // Transition states
  const [cashInPending, startCashInTransition] = useTransition()
  const [cashOutPending, startCashOutTransition] = useTransition()
  const [closePending, startCloseTransition] = useTransition()
  const [reopenPending, startReopenTransition] = useTransition()
  const [undoPending, startUndoTransition] = useTransition()

  const isSessionOpen = session.status === 'open'
  const isSessionClosed = session.status === 'closed'

  const { data: transactions, isLoading: txLoading } = useQuery({
    queryKey: ['drawer-session-transactions', session.id],
    queryFn: () => fetchDrawerSessionTransactions(session.id),
    enabled: open,
  })

  const { data: assetAccounts } = useQuery({
    queryKey: ['active-cash-accounts', kitchen.id],
    queryFn: () => fetchActiveCashAccounts(kitchen.id),
    enabled: open && isSessionOpen,
  })

  function invalidate() {
    queryClient.invalidateQueries({
      queryKey: ['drawer-session-transactions', session.id],
    })
    queryClient.invalidateQueries({ queryKey: DRAWER_SESSIONS_QUERY_KEY })
  }

  // --- Cash In ---
  function handleCashIn(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setCashInError(null)
    const fd = new FormData(e.currentTarget)
    const amountRaw = (fd.get('amount') as string)?.trim()
    const reason = (fd.get('reason') as string)?.trim() || undefined
    const amount = Number.parseFloat(amountRaw ?? '')
    if (Number.isNaN(amount) || amount <= 0)
      return setCashInError('Enter a valid amount greater than 0.')
    if (!cashInAccountId) return setCashInError('Select a source account.')

    startCashInTransition(async () => {
      try {
        const result = await addCashIn(kitchen.id, {
          sessionId: session.id,
          amount,
          sourceAccountId: cashInAccountId,
          reason,
        })
        if (result instanceof Error) return setCashInError(result.message)
        setCashInOpen(false)
        setCashInAccountId('')
        invalidate()
      } catch {
        setCashInError('Something went wrong. Please try again.')
      }
    })
  }

  // --- Cash Out ---
  function handleCashOut(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setCashOutError(null)
    const fd = new FormData(e.currentTarget)
    const amountRaw = (fd.get('amount') as string)?.trim()
    const reason = (fd.get('reason') as string)?.trim() || undefined
    const amount = Number.parseFloat(amountRaw ?? '')
    if (Number.isNaN(amount) || amount <= 0)
      return setCashOutError('Enter a valid amount greater than 0.')
    if (!cashOutAccountId) return setCashOutError('Select a destination account.')

    startCashOutTransition(async () => {
      try {
        const result = await addCashOut(kitchen.id, {
          sessionId: session.id,
          amount,
          destinationAccountId: cashOutAccountId,
          reason,
        })
        if (result instanceof Error) return setCashOutError(result.message)
        setCashOutOpen(false)
        setCashOutAccountId('')
        invalidate()
      } catch {
        setCashOutError('Something went wrong. Please try again.')
      }
    })
  }

  // --- Close ---
  function handleClose(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setCloseError(null)
    const fd = new FormData(e.currentTarget)
    const amountRaw = (fd.get('actual_close') as string)?.trim()
    const reason = (fd.get('reason') as string)?.trim() || undefined
    const actual = Number.parseFloat(amountRaw ?? '')
    if (Number.isNaN(actual) || actual < 0)
      return setCloseError('Enter a valid closing amount.')

    const today = new Date().toISOString().split('T')[0]

    startCloseTransition(async () => {
      try {
        const result = await closeDrawerSession(kitchen.id, {
          sessionId: session.id,
          actualCloseAmount: actual,
          reason,
          closeDate: today,
        })
        if (result instanceof Error) return setCloseError(result.message)
        setCloseOpen(false)
        setCloseError(null)
        onOpenChange(false)
        invalidate()
      } catch {
        setCloseError('Something went wrong. Please try again.')
      }
    })
  }

  // --- Reopen ---
  function handleReopen(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setReopenError(null)
    const fd = new FormData(e.currentTarget)
    const reason = (fd.get('reason') as string)?.trim()
    if (!reason) return setReopenError('A reason is required.')

    startReopenTransition(async () => {
      try {
        const result = await reopenDrawerSession(kitchen.id, session.id, reason)
        if (result instanceof Error) return setReopenError(result.message)
        setReopenOpen(false)
        setReopenError(null)
        invalidate()
      } catch {
        setReopenError('Something went wrong. Please try again.')
      }
    })
  }

  // --- Undo ---
  function handleUndo() {
    if (!undoTarget) return
    setUndoError(null)
    startUndoTransition(async () => {
      try {
        const result = await undoDrawerTransaction(kitchen.id, undoTarget.id)
        if (result instanceof Error) return setUndoError(result.message)
        setUndoTarget(null)
        setUndoError(null)
        invalidate()
      } catch {
        setUndoError('Something went wrong. Please try again.')
      }
    })
  }

  return (
    <>
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent className="flex flex-col gap-0 p-0">
          <SheetHeader className="px-4 pt-4 pb-0">
            <SheetTitle>Drawer Session</SheetTitle>
            <SheetDescription asChild>
              <StatusBadge session={session} />
            </SheetDescription>
          </SheetHeader>

          <Separator className="mt-4" />

          <div className="px-4 pt-2">
            <div className="divide-y divide-border">
              {session.drawer_account && (
                <StatRow
                  label="Drawer Account"
                  value={`${session.drawer_account.code} · ${session.drawer_account.name}`}
                />
              )}
              <StatRow
                label="Opened By"
                value={session.opened_member?.profiles?.full_name ?? '—'}
              />
              <StatRow label="Opened At" value={formatDateTime(session.opened_at)} />
              {session.closed_by && (
                <StatRow
                  label="Closed By"
                  value={session.closed_member?.profiles?.full_name ?? '—'}
                />
              )}
              {session.closed_at && (
                <StatRow label="Closed At" value={formatDateTime(session.closed_at)} />
              )}
              {session.reopened_at && (
                <>
                  <StatRow
                    label="Reopened By"
                    value={session.reopened_member?.profiles?.full_name ?? '—'}
                  />
                  <StatRow label="Reopened At" value={formatDateTime(session.reopened_at)} />
                  <StatRow label="Reopen Reason" value={session.reopen_reason ?? '—'} />
                </>
              )}
              <StatRow
                label="Opening Balance"
                value={formatAmount(session.opening_balance)}
              />
              <StatRow
                label="Expected Closing"
                value={formatAmount(session.expected_closing_balance)}
              />
              {session.actual_closing_balance !== null && (
                <StatRow
                  label="Actual Closing"
                  value={formatAmount(session.actual_closing_balance)}
                />
              )}
              {session.variance !== null && (
                <div className="flex items-center justify-between gap-3 py-2">
                  <span className="text-sm text-muted-foreground">Variance</span>
                  <VarianceDisplay
                    variance={session.variance}
                    varianceType={session.variance_type}
                  />
                </div>
              )}
            </div>
          </div>

          {/* Action bar */}
          {isSessionOpen && (
            <>
              <Separator className="mt-2" />
              <div className="flex gap-2 px-4 py-3">
                <Button
                  size="sm"
                  variant="outline"
                  className="flex-1"
                  onClick={() => setCashInOpen(true)}
                >
                  Cash In
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="flex-1"
                  onClick={() => setCashOutOpen(true)}
                >
                  Cash Out
                </Button>
                <Button
                  size="sm"
                  variant="destructive"
                  className="flex-1"
                  onClick={() => setCloseOpen(true)}
                >
                  Close
                </Button>
              </div>
            </>
          )}

          {isSessionClosed && (
            <>
              <Separator className="mt-2" />
              <div className="flex gap-2 px-4 py-3">
                <Button
                  size="sm"
                  variant="outline"
                  className="flex-1"
                  onClick={() => setReopenOpen(true)}
                >
                  Reopen Session
                </Button>
              </div>
            </>
          )}

          <Separator />

          {/* Transactions list */}
          <div className="flex min-h-0 flex-1 flex-col overflow-y-auto px-4 pb-4">
            <p className="pt-4 pb-1 text-sm font-medium">Transactions</p>
            {txLoading ? (
              <div className="flex items-center justify-center py-8">
                <Spinner />
              </div>
            ) : !transactions || transactions.length === 0 ? (
              <p className="py-8 text-center text-sm text-muted-foreground">
                No transactions for this session.
              </p>
            ) : (
              <div className="divide-y divide-border">
                {transactions.map((tx) => (
                  <DrawerTransactionRow
                    key={tx.id}
                    tx={tx}
                    sessionIsOpen={isSessionOpen}
                    onUndo={setUndoTarget}
                  />
                ))}
              </div>
            )}
          </div>
        </SheetContent>
      </Sheet>

      {/* Cash In dialog */}
      <Dialog
        open={cashInOpen}
        onOpenChange={(next) => {
          if (cashInPending) return
          setCashInOpen(next)
          if (!next) {
            setCashInAccountId('')
            setCashInError(null)
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Cash In</DialogTitle>
            <DialogDescription>
              Transfer cash into this drawer from another account.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleCashIn}>
            <FieldGroup>
              <Field>
                <FieldLabel>Source Account</FieldLabel>
                <AccountSelect
                  accounts={assetAccounts}
                  value={cashInAccountId}
                  onChange={setCashInAccountId}
                  excludeId={session.drawer_account_id}
                  disabled={cashInPending}
                  placeholder="Select source account"
                />
              </Field>
              <Field>
                <FieldLabel htmlFor="ci-amount">Amount</FieldLabel>
                <Input
                  id="ci-amount"
                  name="amount"
                  type="text"
                  inputMode="decimal"
                  placeholder="0.000"
                  required
                  disabled={cashInPending}
                />
              </Field>
              <Field>
                <FieldLabel htmlFor="ci-reason">Reason (optional)</FieldLabel>
                <Input
                  id="ci-reason"
                  name="reason"
                  placeholder="e.g. Float top-up"
                  disabled={cashInPending}
                />
              </Field>
            </FieldGroup>
            {cashInError && <FieldError className="mt-2">{cashInError}</FieldError>}
            <DialogFooter className="mt-4">
              <DialogClose asChild>
                <Button type="button" variant="outline" disabled={cashInPending}>
                  Cancel
                </Button>
              </DialogClose>
              <Button type="submit" disabled={cashInPending} className="min-w-28">
                {cashInPending && <Spinner data-icon="inline-start" />}
                Add Cash In
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Cash Out dialog */}
      <Dialog
        open={cashOutOpen}
        onOpenChange={(next) => {
          if (cashOutPending) return
          setCashOutOpen(next)
          if (!next) {
            setCashOutAccountId('')
            setCashOutError(null)
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Cash Out</DialogTitle>
            <DialogDescription>
              Transfer cash out of this drawer to another account.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleCashOut}>
            <FieldGroup>
              <Field>
                <FieldLabel>Destination Account</FieldLabel>
                <AccountSelect
                  accounts={assetAccounts}
                  value={cashOutAccountId}
                  onChange={setCashOutAccountId}
                  excludeId={session.drawer_account_id}
                  disabled={cashOutPending}
                  placeholder="Select destination account"
                />
              </Field>
              <Field>
                <FieldLabel htmlFor="co-amount">Amount</FieldLabel>
                <Input
                  id="co-amount"
                  name="amount"
                  type="text"
                  inputMode="decimal"
                  placeholder="0.000"
                  required
                  disabled={cashOutPending}
                />
              </Field>
              <Field>
                <FieldLabel htmlFor="co-reason">Reason (optional)</FieldLabel>
                <Input
                  id="co-reason"
                  name="reason"
                  placeholder="e.g. Cash drop"
                  disabled={cashOutPending}
                />
              </Field>
            </FieldGroup>
            {cashOutError && <FieldError className="mt-2">{cashOutError}</FieldError>}
            <DialogFooter className="mt-4">
              <DialogClose asChild>
                <Button type="button" variant="outline" disabled={cashOutPending}>
                  Cancel
                </Button>
              </DialogClose>
              <Button type="submit" disabled={cashOutPending} className="min-w-28">
                {cashOutPending && <Spinner data-icon="inline-start" />}
                Add Cash Out
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Close drawer dialog */}
      <Dialog
        open={closeOpen}
        onOpenChange={(next) => {
          if (closePending) return
          setCloseOpen(next)
          if (!next) setCloseError(null)
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Close drawer</DialogTitle>
            <DialogDescription>
              Enter the actual cash counted to close this session. A variance
              journal entry will be posted automatically if there is a
              discrepancy.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleClose}>
            <FieldGroup>
              <Field>
                <FieldLabel htmlFor="close-expected">
                  Expected Closing Balance
                </FieldLabel>
                <Input
                  id="close-expected"
                  value={formatAmount(session.expected_closing_balance)}
                  readOnly
                  disabled
                  className="text-muted-foreground"
                />
              </Field>
              <Field>
                <FieldLabel htmlFor="close-actual">
                  Actual Cash Counted
                </FieldLabel>
                <Input
                  id="close-actual"
                  name="actual_close"
                  type="text"
                  inputMode="decimal"
                  placeholder="0.000"
                  required
                  disabled={closePending}
                />
              </Field>
              <Field>
                <FieldLabel htmlFor="close-reason">
                  Reason (optional)
                </FieldLabel>
                <Input
                  id="close-reason"
                  name="reason"
                  placeholder="e.g. End of day close"
                  disabled={closePending}
                />
              </Field>
            </FieldGroup>
            {closeError && <FieldError className="mt-2">{closeError}</FieldError>}
            <DialogFooter className="mt-4">
              <DialogClose asChild>
                <Button type="button" variant="outline" disabled={closePending}>
                  Cancel
                </Button>
              </DialogClose>
              <Button type="submit" disabled={closePending} className="min-w-28">
                {closePending && <Spinner data-icon="inline-start" />}
                Close drawer
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Reopen dialog */}
      <Dialog
        open={reopenOpen}
        onOpenChange={(next) => {
          if (reopenPending) return
          setReopenOpen(next)
          if (!next) setReopenError(null)
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reopen drawer session</DialogTitle>
            <DialogDescription>
              Reopening will reverse any over/short journal entry posted at
              close. The session will return to open status. A reason is
              required.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleReopen}>
            <FieldGroup>
              <Field>
                <FieldLabel htmlFor="reopen-reason">Reason</FieldLabel>
                <Textarea
                  id="reopen-reason"
                  name="reason"
                  placeholder="e.g. Incorrect closing amount entered"
                  rows={3}
                  required
                  disabled={reopenPending}
                />
              </Field>
            </FieldGroup>
            {reopenError && <FieldError className="mt-2">{reopenError}</FieldError>}
            <DialogFooter className="mt-4">
              <DialogClose asChild>
                <Button type="button" variant="outline" disabled={reopenPending}>
                  Cancel
                </Button>
              </DialogClose>
              <Button type="submit" disabled={reopenPending} className="min-w-28">
                {reopenPending && <Spinner data-icon="inline-start" />}
                Reopen
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Undo confirmation dialog */}
      <Dialog
        open={undoTarget !== null}
        onOpenChange={(next) => {
          if (undoPending) return
          if (!next) {
            setUndoTarget(null)
            setUndoError(null)
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Undo transaction</DialogTitle>
            <DialogDescription>
              This will create a reversing transaction and update the expected
              closing balance. This cannot be undone itself.
            </DialogDescription>
          </DialogHeader>
          {undoError && <FieldError className="mt-2">{undoError}</FieldError>}
          <DialogFooter className="mt-4">
            <DialogClose asChild>
              <Button type="button" variant="outline" disabled={undoPending}>
                Cancel
              </Button>
            </DialogClose>
            <Button
              variant="destructive"
              onClick={handleUndo}
              disabled={undoPending}
              className="min-w-28"
            >
              {undoPending && <Spinner data-icon="inline-start" />}
              Confirm undo
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
