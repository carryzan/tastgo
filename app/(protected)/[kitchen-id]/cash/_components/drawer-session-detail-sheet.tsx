'use client'

import { useQuery } from '@tanstack/react-query'
import { Spinner } from '@/components/ui/spinner'
import { Separator } from '@/components/ui/separator'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import {
  fetchDrawerSessionTransactions,
  type DrawerTransaction,
} from '../_lib/client-queries'
import type { DrawerSession } from './drawer-session-columns'

interface DrawerSessionDetailSheetProps {
  session: DrawerSession
  open: boolean
  onOpenChange: (open: boolean) => void
}

const TRANSACTION_TYPE_LABELS: Record<string, string> = {
  cash_in: 'Cash In',
  cash_out: 'Cash Out',
  payout: 'Payout',
  cash_drop: 'Cash Drop',
  no_sale: 'No Sale',
  close: 'Close',
}

const SOURCE_TYPE_LABELS: Record<string, string> = {
  expense: 'Expense',
  purchase: 'Purchase',
  cash_account: 'Cash Account',
  order: 'Order',
  manual: 'Manual',
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

function StatusBadge({ status }: { status: DrawerSession['status'] }) {
  const styles = {
    open: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
    paused: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400',
    closed: 'bg-muted text-muted-foreground',
  }
  return (
    <span
      className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium capitalize ${styles[status]}`}
    >
      {status}
    </span>
  )
}

function DrawerTransactionRow({ tx }: { tx: DrawerTransaction }) {
  const isCredit = tx.type === 'cash_in'
  return (
    <div className="flex items-start justify-between gap-3 py-3">
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium">
            {TRANSACTION_TYPE_LABELS[tx.type] ?? tx.type}
          </span>
          {tx.source_type && tx.source_type !== 'manual' && (
            <span className="text-xs text-muted-foreground">
              ({SOURCE_TYPE_LABELS[tx.source_type] ?? tx.source_type})
            </span>
          )}
        </div>
        {tx.reason && (
          <p className="mt-0.5 text-xs text-muted-foreground">{tx.reason}</p>
        )}
        <p className="mt-0.5 text-xs text-muted-foreground">
          {tx.created_member?.profiles?.full_name ?? 'Unknown'} ·{' '}
          {formatDateTime(tx.created_at)}
        </p>
      </div>
      <span
        className={`shrink-0 text-sm font-medium ${
          isCredit
            ? 'text-green-600 dark:text-green-400'
            : 'text-muted-foreground'
        }`}
      >
        {formatAmount(tx.amount)}
      </span>
    </div>
  )
}

export function DrawerSessionDetailSheet({
  session,
  open,
  onOpenChange,
}: DrawerSessionDetailSheetProps) {
  const { data: transactions, isLoading } = useQuery({
    queryKey: ['drawer-session-transactions', session.id],
    queryFn: () => fetchDrawerSessionTransactions(session.id),
    enabled: open,
  })

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="flex flex-col gap-0 p-0">
        <SheetHeader className="px-4 pt-4 pb-0">
          <SheetTitle>Drawer Session</SheetTitle>
          <SheetDescription>
            <StatusBadge status={session.status} />
          </SheetDescription>
        </SheetHeader>

        <Separator className="mt-4" />

        {/* Session Summary */}
        <div className="px-4 pt-2">
          <div className="divide-y divide-border">
            <StatRow label="Opened By" value={session.opened_member?.profiles?.full_name ?? '—'} />
            <StatRow label="Opened At" value={formatDateTime(session.opened_at)} />
            {session.closed_by && (
              <StatRow label="Closed By" value={session.closed_member?.profiles?.full_name ?? '—'} />
            )}
            {session.closed_at && (
              <StatRow label="Closed At" value={formatDateTime(session.closed_at)} />
            )}
            <StatRow label="Opening Balance" value={formatAmount(session.opening_balance)} />
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

        <Separator className="mt-2" />

        {/* Transaction List */}
        <div className="flex min-h-0 flex-1 flex-col overflow-y-auto px-4 pb-4">
          <p className="pt-4 pb-1 text-sm font-medium">Transactions</p>
          {isLoading ? (
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
                <DrawerTransactionRow key={tx.id} tx={tx} />
              ))}
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  )
}
