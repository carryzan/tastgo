'use client'

import * as React from 'react'
import { useQuery } from '@tanstack/react-query'
import {
  useReactTable,
  getCoreRowModel,
  flexRender,
  type ColumnDef,
} from '@tanstack/react-table'
import { type DateRange } from 'react-day-picker'
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
import {
  fetchCashAccountTransactions,
  type CashAccountTransaction,
} from '../_lib/client-queries'
import type { CashAccount } from './cash-account-columns'
import {
  TransactionDateRangePicker,
  filterByDateRange,
} from './transaction-date-range-picker'

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

const columns: ColumnDef<CashAccountTransaction>[] = [
  {
    accessorKey: 'type',
    header: 'Type',
    cell: ({ row }) => (
      <span className="capitalize">{row.original.type}</span>
    ),
  },
  {
    id: 'source',
    header: 'Source',
    cell: ({ row }) => {
      const { source_type } = row.original
      if (!source_type) return '—'
      return SOURCE_TYPE_LABELS[source_type] ?? source_type
    },
  },
  {
    accessorKey: 'amount',
    header: 'Amount',
    cell: ({ row }) => {
      const isCredit = row.original.type === 'deposit'
      return (
        <span
          className={
            isCredit
              ? 'font-medium text-green-600 dark:text-green-400'
              : 'font-medium text-destructive'
          }
        >
          {isCredit ? '+' : '-'}
          {formatAmount(row.original.amount)}
        </span>
      )
    },
  },
  {
    id: 'transfer_to',
    header: 'Transfer To',
    cell: ({ row }) => row.original.transfer_to_account?.name ?? '—',
  },
  {
    accessorKey: 'reason',
    header: 'Reason',
    cell: ({ row }) => row.original.reason ?? '—',
  },
  {
    id: 'created_by',
    header: 'By',
    cell: ({ row }) =>
      row.original.created_member?.profiles?.full_name ?? '—',
  },
  {
    accessorKey: 'created_at',
    header: 'Date',
    cell: ({ row }) =>
      new Date(row.original.created_at).toLocaleString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
      }),
  },
]

export function CashAccountTransactionsSheet({
  account,
  open,
  onOpenChange,
}: CashAccountTransactionsSheetProps) {
  const [dateRange, setDateRange] = React.useState<DateRange | undefined>()

  const { data: transactions, isLoading } = useQuery({
    queryKey: ['cash-account-transactions', account.id],
    queryFn: () => fetchCashAccountTransactions(account.id),
    enabled: open,
  })

  const filtered = React.useMemo(
    () => filterByDateRange(transactions ?? [], dateRange),
    [transactions, dateRange]
  )

  const table = useReactTable({
    data: filtered,
    columns,
    getCoreRowModel: getCoreRowModel(),
  })

  const rows = table.getRowModel().rows

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="flex flex-col gap-0 p-0">
        <SheetHeader className="px-4 pt-4 pb-4">
          <SheetTitle>{account.name}</SheetTitle>
          <SheetDescription>
            Balance:{' '}
            <span className="font-medium text-foreground">
              {formatAmount(account.current_balance)}
            </span>
          </SheetDescription>
        </SheetHeader>

        <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
          <div className="flex shrink-0 items-center justify-between px-4 py-2">
            <p className="text-sm font-medium">Transaction History</p>
            <TransactionDateRangePicker
              value={dateRange}
              onChange={setDateRange}
            />
          </div>

          <div className="min-h-0 flex-1 overflow-auto overscroll-contain border-t">
            {isLoading ? (
              <div className="flex items-center justify-center py-16">
                <Spinner />
              </div>
            ) : (
              <Table>
                <TableHeader>
                  {table.getHeaderGroups().map((headerGroup) => (
                    <TableRow key={headerGroup.id}>
                      {headerGroup.headers.map((header, index) => (
                        <TableHead
                          key={header.id}
                          className={index === 0 ? 'pl-4 text-muted-foreground' : 'text-muted-foreground'}
                        >
                          {header.isPlaceholder
                            ? null
                            : flexRender(
                                header.column.columnDef.header,
                                header.getContext()
                              )}
                        </TableHead>
                      ))}
                    </TableRow>
                  ))}
                </TableHeader>
                <TableBody>
                  {rows.length > 0 ? (
                      rows.map((row) => (
                      <TableRow key={row.id}>
                        {row.getVisibleCells().map((cell, index) => (
                          <TableCell key={cell.id} className={index === 0 ? 'pl-4' : undefined}>
                            {flexRender(
                              cell.column.columnDef.cell,
                              cell.getContext()
                            )}
                          </TableCell>
                        ))}
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell
                        colSpan={columns.length}
                        className="h-24 text-center text-muted-foreground"
                      >
                        No transactions{dateRange ? ' in this date range' : ' yet'}.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            )}
          </div>
        </div>
      </SheetContent>
    </Sheet>
  )
}
