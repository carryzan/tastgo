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
  fetchCashAccountTransactions,
  type CashAccountTransaction,
} from '../_lib/client-queries'
import type { CashAccount } from './cash-account-columns'

interface CashAccountTransactionsSheetProps {
  account: CashAccount
  open: boolean
  onOpenChange: (open: boolean) => void
}

const SOURCE_TYPE_LABELS: Record<string, string> = {
  drawer_deposit: 'Drawer Deposit',
  marketplace_payout: 'Marketplace Payout',
  expense: 'Expense',
  supplier_payment: 'Supplier Payment',
  supplier_refund: 'Supplier Refund',
  refund: 'Refund',
  manual: 'Manual',
}

function formatAmount(value: string | number) {
  const n = typeof value === 'string' ? Number(value) : value
  if (Number.isNaN(n)) return '—'
  return n.toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 3,
  })
}

function formatDateTime(iso: string) {
  return new Date(iso).toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })
}

function TransactionRow({ tx }: { tx: CashAccountTransaction }) {
  const isCredit = tx.type === 'deposit'
  return (
    <div className="flex items-start justify-between gap-3 py-3">
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium capitalize">{tx.type}</span>
          {tx.source_type && tx.source_type !== 'manual' && (
            <span className="text-xs text-muted-foreground">
              ({SOURCE_TYPE_LABELS[tx.source_type] ?? tx.source_type})
            </span>
          )}
        </div>
        {tx.reason && (
          <p className="mt-0.5 text-xs text-muted-foreground">{tx.reason}</p>
        )}
        {tx.transfer_to_account && (
          <p className="mt-0.5 text-xs text-muted-foreground">
            → {tx.transfer_to_account.name}
          </p>
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
            : 'text-destructive'
        }`}
      >
        {isCredit ? '+' : '-'}
        {formatAmount(tx.amount)}
      </span>
    </div>
  )
}

export function CashAccountTransactionsSheet({
  account,
  open,
  onOpenChange,
}: CashAccountTransactionsSheetProps) {
  const { data: transactions, isLoading } = useQuery({
    queryKey: ['cash-account-transactions', account.id],
    queryFn: () => fetchCashAccountTransactions(account.id),
    enabled: open,
  })

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="flex flex-col gap-0 p-0">
        <SheetHeader className="px-4 pt-4 pb-0">
          <SheetTitle>{account.name}</SheetTitle>
          <SheetDescription>
            Balance:{' '}
            <span className="font-medium text-foreground">
              {formatAmount(account.current_balance)}
            </span>
          </SheetDescription>
        </SheetHeader>

        <Separator className="mt-4" />

        <div className="flex min-h-0 flex-1 flex-col overflow-y-auto px-4 pb-4">
          <p className="pt-4 pb-1 text-sm font-medium">Transaction History</p>
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Spinner />
            </div>
          ) : !transactions || transactions.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">
              No transactions yet.
            </p>
          ) : (
            <div className="divide-y divide-border">
              {transactions.map((tx) => (
                <TransactionRow key={tx.id} tx={tx} />
              ))}
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  )
}
