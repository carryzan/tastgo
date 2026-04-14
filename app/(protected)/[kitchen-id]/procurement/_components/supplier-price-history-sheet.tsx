'use client'

import { useKitchen } from '@/hooks/use-kitchen'
import { useQuery } from '@tanstack/react-query'
import { fetchSupplierPriceHistory } from '../_lib/client-queries'
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

interface SupplierPriceHistorySheetProps {
  supplier: Supplier
  open: boolean
  onOpenChange: (open: boolean) => void
}

function formatCost(value: string | number) {
  const n = typeof value === 'string' ? Number(value) : value
  if (Number.isNaN(n)) return '—'
  return n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 4 })
}

export function SupplierPriceHistorySheet({
  supplier,
  open,
  onOpenChange,
}: SupplierPriceHistorySheetProps) {
  const { kitchen } = useKitchen()

  const { data: history, isLoading } = useQuery({
    queryKey: ['supplier-price-history', supplier.id],
    queryFn: () => fetchSupplierPriceHistory(kitchen.id, supplier.id),
    enabled: open,
  })

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="flex flex-col gap-0 p-0 sm:max-w-xl">
        <SheetHeader className="px-4 pb-4 pt-4">
          <SheetTitle>Price History</SheetTitle>
          <SheetDescription>{supplier.name}</SheetDescription>
        </SheetHeader>

        <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
          <div className="flex-1 overflow-y-auto">
            {isLoading ? (
              <div className="flex items-center justify-center py-16">
                <Spinner />
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="pl-4">Item</TableHead>
                    <TableHead>Previous cost</TableHead>
                    <TableHead>New cost</TableHead>
                    <TableHead>Changed by</TableHead>
                    <TableHead>Date</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(history ?? []).length > 0 ? (
                    (history ?? []).map((row) => (
                      <TableRow key={row.id}>
                        <TableCell className="pl-4">
                          {row.inventory_items?.name ?? '—'}
                        </TableCell>
                        <TableCell>{formatCost(row.previous_unit_cost)}</TableCell>
                        <TableCell className="font-medium">
                          {formatCost(row.new_unit_cost)}
                        </TableCell>
                        <TableCell>
                          {row.changed_by_member?.profiles?.full_name ?? '—'}
                        </TableCell>
                        <TableCell>
                          {new Date(row.created_at).toLocaleDateString('en-US', {
                            month: 'short',
                            day: 'numeric',
                            year: 'numeric',
                          })}
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell
                        colSpan={5}
                        className="h-24 text-center text-muted-foreground"
                      >
                        No price changes recorded yet.
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
