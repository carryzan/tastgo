'use client'

import { useQuery } from '@tanstack/react-query'
import { fetchPurchaseItems } from '../_lib/client-queries'
import type { Purchase } from './purchase-columns'
import { Badge } from '@/components/ui/badge'
import { Spinner } from '@/components/ui/spinner'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
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

interface PurchaseDetailSheetProps {
  purchase: Purchase
  open: boolean
  onOpenChange: (open: boolean) => void
}

const STATUS_VARIANTS: Record<Purchase['status'], 'default' | 'secondary' | 'outline'> = {
  draft: 'outline',
  sent: 'secondary',
  received: 'default',
}

function formatAmount(value: string | number | null | undefined, maximumFractionDigits = 2) {
  if (value == null) return '—'
  const n = typeof value === 'string' ? Number(value) : value
  if (Number.isNaN(n)) return '—'
  return n.toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits,
  })
}

function formatQuantity(value: string | number | null | undefined) {
  if (value == null) return '—'
  const n = typeof value === 'string' ? Number(value) : value
  if (Number.isNaN(n)) return '—'
  return n.toLocaleString('en-US', {
    maximumFractionDigits: 4,
  })
}

function formatDate(value: string | null) {
  if (!value) return '—'
  return new Date(value).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

export function PurchaseDetailSheet({
  purchase,
  open,
  onOpenChange,
}: PurchaseDetailSheetProps) {
  const { data: items, isLoading } = useQuery({
    queryKey: ['purchase-items', purchase.id],
    queryFn: () => fetchPurchaseItems(purchase.id),
    enabled: open,
  })

  const grandTotal =
    purchase.status === 'received' && purchase.received_total != null
      ? purchase.received_total
      : purchase.ordered_total

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="flex flex-col gap-0 p-0 sm:max-w-3xl">
        <SheetHeader className="border-b px-4 py-4">
          <SheetTitle>Purchase detail #{purchase.purchase_number}</SheetTitle>
          <SheetDescription>
            {purchase.suppliers?.name ?? '—'}
            {purchase.supplier_invoice_code
              ? ` — Invoice ${purchase.supplier_invoice_code}`
              : ''}
          </SheetDescription>
        </SheetHeader>

        <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
          <div className="flex flex-wrap items-center gap-3 border-b px-4 py-3">
            <Badge variant={STATUS_VARIANTS[purchase.status]}>
              {purchase.status.charAt(0).toUpperCase() + purchase.status.slice(1)}
            </Badge>
            <span className="text-sm text-muted-foreground">
              Ordered:{' '}
              <span className="font-medium text-foreground">
                {formatAmount(purchase.ordered_total)}
              </span>
            </span>
            <span className="text-sm text-muted-foreground">
              Received:{' '}
              <span className="font-medium text-foreground">
                {formatAmount(purchase.received_total)}
              </span>
            </span>
            <span className="text-sm text-muted-foreground">
              Created:{' '}
              <span className="font-medium text-foreground">
                {formatDate(purchase.created_at)}
              </span>
            </span>
            {purchase.received_at && (
              <span className="text-sm text-muted-foreground">
                Received date:{' '}
                <span className="font-medium text-foreground">
                  {formatDate(purchase.received_at)}
                </span>
              </span>
            )}
          </div>

          <div className="flex-1 overflow-x-auto overflow-y-auto">
            {isLoading ? (
              <div className="flex items-center justify-center py-16">
                <Spinner />
              </div>
            ) : (
              <Table className="min-w-[680px]">
                <TableHeader>
                  <TableRow>
                    <TableHead className="pl-4">Item</TableHead>
                    <TableHead>Ordered</TableHead>
                    <TableHead>Received</TableHead>
                    <TableHead>Unit cost</TableHead>
                    <TableHead>Line total</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(items ?? []).length === 0 ? (
                    <TableRow>
                      <TableCell
                        colSpan={5}
                        className="h-24 text-center text-muted-foreground"
                      >
                        No items found.
                      </TableCell>
                    </TableRow>
                  ) : (
                    (items ?? []).map((item) => (
                      <TableRow key={item.id}>
                        <TableCell className="pl-4 font-medium">
                          {item.inventory_items?.name ?? '—'}
                        </TableCell>
                        <TableCell className="tabular-nums">
                          {formatQuantity(item.ordered_quantity)}
                        </TableCell>
                        <TableCell className="tabular-nums">
                          {formatQuantity(item.received_quantity)}
                        </TableCell>
                        <TableCell className="tabular-nums">
                          {formatAmount(item.unit_cost, 4)}
                        </TableCell>
                        <TableCell className="font-medium tabular-nums">
                          {formatAmount(item.line_total)}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            )}
          </div>
        </div>

        <div className="border-t" />
        <SheetFooter>
          <div className="flex w-full items-center justify-between text-sm">
            <span className="font-medium">Grand total</span>
            <span className="font-medium tabular-nums text-muted-foreground">
              {formatAmount(grandTotal)}
            </span>
          </div>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  )
}
