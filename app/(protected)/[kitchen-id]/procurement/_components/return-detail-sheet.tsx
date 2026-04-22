'use client'

import { useState, useTransition } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useKitchen } from '@/hooks/use-kitchen'
import { approveSupplierReturn, issueCreditNoteFromReturn } from '../_lib/return-actions'
import { RETURNS_QUERY_KEY, CREDIT_NOTES_QUERY_KEY } from '../_lib/queries'
import { fetchReturnItems } from '../_lib/client-queries'
import type { SupplierReturn } from './return-columns'
import { Button } from '@/components/ui/button'
import { Spinner } from '@/components/ui/spinner'
import { Badge } from '@/components/ui/badge'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import { FieldError } from '@/components/ui/field'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/data-table/data-table-primitives'

interface ReturnDetailSheetProps {
  supplierReturn: SupplierReturn
  open: boolean
  onOpenChange: (open: boolean) => void
}

function formatAmount(value: string | number) {
  const n = typeof value === 'string' ? Number(value) : value
  if (Number.isNaN(n)) return '—'
  return n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 4 })
}

export function ReturnDetailSheet({
  supplierReturn,
  open,
  onOpenChange,
}: ReturnDetailSheetProps) {
  const { kitchen } = useKitchen()
  const queryClient = useQueryClient()
  const [error, setError] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()

  const { data: items, isLoading } = useQuery({
    queryKey: ['return-items', supplierReturn.id],
    queryFn: () => fetchReturnItems(supplierReturn.id),
    enabled: open,
  })

  function handleApprove() {
    setError(null)
    startTransition(async () => {
      try {
        const result = await approveSupplierReturn(kitchen.id, supplierReturn.id)
        if (result instanceof Error) return setError(result.message)
        queryClient.invalidateQueries({ queryKey: RETURNS_QUERY_KEY })
        queryClient.invalidateQueries({ queryKey: CREDIT_NOTES_QUERY_KEY })
        onOpenChange(false)
      } catch {
        setError('Something went wrong. Please try again.')
      }
    })
  }

  function handleIssueCreditNote() {
    setError(null)
    startTransition(async () => {
      try {
        const result = await issueCreditNoteFromReturn(kitchen.id, supplierReturn.id)
        if (result instanceof Error) return setError(result.message)
        queryClient.invalidateQueries({ queryKey: RETURNS_QUERY_KEY })
        queryClient.invalidateQueries({ queryKey: CREDIT_NOTES_QUERY_KEY })
        onOpenChange(false)
      } catch {
        setError('Something went wrong. Please try again.')
      }
    })
  }

  const totalCredit = formatAmount(supplierReturn.total_credit_value)

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="flex flex-col gap-0 p-0 sm:max-w-xl">
        <SheetHeader className="px-4 pb-4 pt-4">
          <SheetTitle>Return detail</SheetTitle>
          <SheetDescription>
            {supplierReturn.suppliers?.name ?? '—'} — Purchase #
            {supplierReturn.purchases?.purchase_number ?? '—'}
          </SheetDescription>
        </SheetHeader>

        <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
          <div className="flex shrink-0 items-center justify-between px-4 py-2">
            <div className="flex items-center gap-2">
              <Badge
                variant={
                  supplierReturn.status === 'pending'
                    ? 'outline'
                    : supplierReturn.status === 'approved'
                      ? 'secondary'
                      : 'default'
                }
              >
                {supplierReturn.status.charAt(0).toUpperCase() +
                  supplierReturn.status.slice(1)}
              </Badge>
              <span className="text-sm text-muted-foreground">
                Total credit: <span className="font-medium text-foreground">{totalCredit}</span>
              </span>
            </div>
          </div>

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
                    <TableHead>Qty</TableHead>
                    <TableHead>Unit cost</TableHead>
                    <TableHead>Credit</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(items ?? []).length === 0 ? (
                    <TableRow>
                      <TableCell
                        colSpan={4}
                        className="h-24 text-center text-muted-foreground"
                      >
                        No items found.
                      </TableCell>
                    </TableRow>
                  ) : (
                    (items ?? []).map((item) => (
                      <TableRow key={item.id}>
                        <TableCell className="pl-4">
                          {item.inventory_items?.name ?? '—'}
                        </TableCell>
                        <TableCell>{formatAmount(item.returned_quantity)}</TableCell>
                        <TableCell>{formatAmount(item.unit_cost)}</TableCell>
                        <TableCell className="font-medium">
                          {formatAmount(item.line_credit_value)}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            )}
          </div>
        </div>

        {(error || supplierReturn.status === 'pending' || supplierReturn.status === 'approved') && (
          <div className="shrink-0 border-t px-4 py-3">
            {error && <FieldError className="mb-3">{error}</FieldError>}
            <SheetFooter className="gap-2">
              {supplierReturn.status === 'pending' && (
                <Button
                  onClick={handleApprove}
                  disabled={isLoading || pending}
                  className="min-w-28"
                >
                  {pending && <Spinner data-icon="inline-start" />}
                  Approve return
                </Button>
              )}
              {supplierReturn.status === 'approved' && (
                <Button
                  onClick={handleIssueCreditNote}
                  disabled={isLoading || pending}
                  className="min-w-28"
                >
                  {pending && <Spinner data-icon="inline-start" />}
                  Issue credit note
                </Button>
              )}
            </SheetFooter>
          </div>
        )}
      </SheetContent>
    </Sheet>
  )
}
