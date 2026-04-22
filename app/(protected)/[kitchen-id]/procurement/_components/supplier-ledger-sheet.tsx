'use client'

import { useKitchen } from '@/hooks/use-kitchen'
import { useQuery } from '@tanstack/react-query'
import { fetchSupplierBalance, fetchSupplierLedger } from '../_lib/client-queries'
import type { Supplier } from './supplier-columns'
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

interface SupplierLedgerSheetProps {
  supplier: Supplier
  open: boolean
  onOpenChange: (open: boolean) => void
}

const ENTRY_TYPE_LABELS: Record<string, string> = {
  opening_balance: 'Opening balance',
  purchase_received: 'Purchase received',
  supplier_payment: 'Payment',
  supplier_credit_note: 'Credit note',
  supplier_credit_refund: 'Credit refund',
  manual_adjustment: 'Adjustment',
}

function formatAmount(value: string | number | undefined | null) {
  if (value == null) return '—'
  const n = typeof value === 'string' ? Number(value) : value
  if (Number.isNaN(n)) return '—'
  return n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

export function SupplierLedgerSheet({
  supplier,
  open,
  onOpenChange,
}: SupplierLedgerSheetProps) {
  const { kitchen } = useKitchen()

  const { data: ledgerEntries, isLoading: ledgerLoading } = useQuery({
    queryKey: ['supplier-ledger', kitchen.id, supplier.id],
    queryFn: () => fetchSupplierLedger(kitchen.id, supplier.id),
    enabled: open,
  })

  const { data: supplierBalance } = useQuery({
    queryKey: ['supplier-balance', supplier.id],
    queryFn: () => fetchSupplierBalance(supplier.id),
    enabled: open,
  })

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="flex flex-col gap-0 p-0 sm:max-w-xl">
        <SheetHeader className="px-4 pb-4 pt-4">
          <SheetTitle>Supplier ledger</SheetTitle>
          <SheetDescription>{supplier.name}</SheetDescription>
        </SheetHeader>

        <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
          <div className="flex items-center justify-between border-b px-4 py-3">
            <span className="text-sm text-muted-foreground">Current balance</span>
            <span className="font-medium tabular-nums">
              {supplierBalance != null ? formatAmount(supplierBalance) : '—'}
            </span>
          </div>

          <div className="flex-1 overflow-y-auto">
            {ledgerLoading ? (
              <div className="flex items-center justify-center py-12">
                <Spinner />
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="pl-4">Type</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Date</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(ledgerEntries ?? []).length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={3} className="pl-4 text-muted-foreground">
                        No ledger entries yet.
                      </TableCell>
                    </TableRow>
                  ) : (
                    (ledgerEntries ?? []).map((entry) => {
                      const amount =
                        typeof entry.amount_signed === 'string'
                          ? Number(entry.amount_signed)
                          : entry.amount_signed

                      return (
                        <TableRow key={entry.id}>
                          <TableCell className="pl-4">
                            {ENTRY_TYPE_LABELS[entry.entry_type] ?? entry.entry_type}
                          </TableCell>
                          <TableCell
                            className={`tabular-nums font-medium ${amount < 0 ? 'text-green-600' : 'text-foreground'}`}
                          >
                            {formatAmount(entry.amount_signed)}
                          </TableCell>
                          <TableCell>
                            {new Date(entry.created_at).toLocaleDateString('en-US', {
                              month: 'short',
                              day: 'numeric',
                              year: 'numeric',
                            })}
                          </TableCell>
                        </TableRow>
                      )
                    })
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
