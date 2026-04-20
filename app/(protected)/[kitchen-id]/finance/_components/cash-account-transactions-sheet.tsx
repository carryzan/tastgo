'use client'

import * as React from 'react'
import { useQuery } from '@tanstack/react-query'
import {
  useReactTable,
  getCoreRowModel,
  flexRender,
  type ColumnDef,
} from '@tanstack/react-table'
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
import {
  fetchAccountLedger,
  fetchAccountBalance,
  type AccountLedgerLine,
} from '../_lib/client-queries'
import type { ChartAccount } from './cash-account-columns'
import { ENTRY_TYPE_LABELS } from './journal-entry-columns'

interface CashAccountTransactionsSheetProps {
  account: ChartAccount
  open: boolean
  onOpenChange: (open: boolean) => void
}


function formatAmount(value: string | number) {
  const n = typeof value === 'string' ? Number(value) : value
  if (Number.isNaN(n)) return '—'
  return n.toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 3,
  })
}

const columns: ColumnDef<AccountLedgerLine>[] = [
  {
    id: 'date',
    header: 'Date',
    cell: ({ row }) =>
      new Date(row.original.entry_date).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      }),
  },
  {
    id: 'journal_number',
    header: 'Journal #',
    cell: ({ row }) => (
      <span className="font-mono text-xs">
        #{row.original.journal_number}
      </span>
    ),
  },
  {
    id: 'type',
    header: 'Type',
    cell: ({ row }) => (
      <Badge variant="outline" className="text-xs">
        {ENTRY_TYPE_LABELS[row.original.entry_type] ?? row.original.entry_type}
      </Badge>
    ),
  },
  {
    id: 'memo',
    header: 'Memo',
    cell: ({ row }) => {
      const memo = row.original.line_memo ?? row.original.memo
      return memo ? (
        <span className="max-w-48 truncate text-sm">{memo}</span>
      ) : (
        '—'
      )
    },
  },
  {
    accessorKey: 'debit',
    header: 'Debit',
    cell: ({ row }) => {
      const d = Number(row.original.debit)
      return d > 0 ? (
        <span className="font-medium">{formatAmount(d)}</span>
      ) : (
        <span className="text-muted-foreground">—</span>
      )
    },
  },
  {
    accessorKey: 'credit',
    header: 'Credit',
    cell: ({ row }) => {
      const c = Number(row.original.credit)
      return c > 0 ? (
        <span className="font-medium">{formatAmount(c)}</span>
      ) : (
        <span className="text-muted-foreground">—</span>
      )
    },
  },
]

export function CashAccountTransactionsSheet({
  account,
  open,
  onOpenChange,
}: CashAccountTransactionsSheetProps) {
  const { data: lines, isLoading } = useQuery({
    queryKey: ['account-ledger', account.id],
    queryFn: () => fetchAccountLedger(account.id),
    enabled: open,
  })

  const { data: balance } = useQuery({
    queryKey: ['account-balance', account.id],
    queryFn: () => fetchAccountBalance(account.id),
    enabled: open,
  })

  const table = useReactTable({
    data: lines ?? [],
    columns,
    getCoreRowModel: getCoreRowModel(),
  })

  const rows = table.getRowModel().rows

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="flex flex-col gap-0 p-0 sm:max-w-2xl">
        <SheetHeader className="px-4 pt-4 pb-4">
          <SheetTitle>
            {account.code} · {account.name}
          </SheetTitle>
          <SheetDescription>
            {balance !== null && balance !== undefined ? (
              <>
                Balance:{' '}
                <span className="font-medium text-foreground">
                  {formatAmount(balance)}
                </span>
              </>
            ) : (
              'Account ledger — all journal entry lines for this account'
            )}
          </SheetDescription>
        </SheetHeader>

        <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
          <div className="flex shrink-0 items-center justify-between border-b px-4 py-2">
            <p className="text-sm font-medium text-muted-foreground">
              Ledger Entries ({lines?.length ?? 0})
            </p>
          </div>

          <div className="min-h-0 flex-1 overflow-auto overscroll-contain">
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
                          className={
                            index === 0
                              ? 'pl-4 text-muted-foreground'
                              : 'text-muted-foreground'
                          }
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
                          <TableCell
                            key={cell.id}
                            className={index === 0 ? 'pl-4' : undefined}
                          >
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
                        No journal entries for this account yet.
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
