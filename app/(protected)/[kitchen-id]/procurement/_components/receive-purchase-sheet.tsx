'use client'

import { useEffect, useState, useTransition } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useKitchen } from '@/hooks/use-kitchen'
import { receivePurchase } from '../_lib/purchase-actions'
import { PURCHASES_QUERY_KEY } from '../_lib/queries'
import { fetchPurchaseItems } from '../_lib/client-queries'
import type { Purchase } from './purchase-columns'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Spinner } from '@/components/ui/spinner'
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet'
import { FieldError } from '@/components/ui/field'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/data-table/data-table-primitives'

interface ReceiveItemState {
  purchase_item_id: string
  inventory_item_name: string
  ordered_quantity: string | number
  received_quantity: string
}

interface ReceivePurchaseSheetProps {
  purchase: Purchase
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function ReceivePurchaseSheet({
  purchase,
  open,
  onOpenChange,
}: ReceivePurchaseSheetProps) {
  const { kitchen } = useKitchen()
  const queryClient = useQueryClient()
  const [receiveItems, setReceiveItems] = useState<ReceiveItemState[]>([])
  const [error, setError] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()

  const { data: purchaseItems, isLoading } = useQuery({
    queryKey: ['purchase-items', purchase.id],
    queryFn: () => fetchPurchaseItems(purchase.id),
    enabled: open,
  })

  useEffect(() => {
    if (!open) {
      setReceiveItems([])
      setError(null)
    }
  }, [open])

  useEffect(() => {
    if (purchaseItems) {
      setReceiveItems(
        purchaseItems.map((item) => ({
          purchase_item_id: item.id,
          inventory_item_name: item.inventory_items?.name ?? '—',
          ordered_quantity: item.ordered_quantity,
          received_quantity: String(item.ordered_quantity),
        }))
      )
    }
  }, [purchaseItems])

  function handleOpenChange(next: boolean) {
    if (pending) return
    onOpenChange(next)
  }

  function updateReceived(index: number, value: string) {
    setReceiveItems((prev) =>
      prev.map((item, i) =>
        i === index ? { ...item, received_quantity: value } : item
      )
    )
  }

  function handleSave() {
    setError(null)

    for (const item of receiveItems) {
      if (item.received_quantity === '' || Number(item.received_quantity) < 0) {
        return setError('Enter a valid received quantity for each item.')
      }
    }

    startTransition(async () => {
      try {
        const result = await receivePurchase(
          kitchen.id,
          purchase.id,
          receiveItems.map((item) => ({
            purchase_item_id: item.purchase_item_id,
            received_quantity: Number(item.received_quantity),
          }))
        )
        if (result instanceof Error) return setError(result.message)
        onOpenChange(false)
        queryClient.invalidateQueries({ queryKey: PURCHASES_QUERY_KEY })
        queryClient.invalidateQueries({ queryKey: ['purchase-items', purchase.id] })
      } catch {
        setError('Something went wrong. Please try again.')
      }
    })
  }

  return (
    <Sheet open={open} onOpenChange={handleOpenChange}>
      <SheetContent
        className="flex flex-col gap-0 p-0 sm:max-w-xl"
        showCloseButton={!pending}
        onInteractOutside={(e) => {
          if (pending) e.preventDefault()
        }}
        onEscapeKeyDown={(e) => {
          if (pending) e.preventDefault()
        }}
      >
        <SheetHeader className="border-b px-4 py-4">
          <SheetTitle>Receive purchase #{purchase.purchase_number}</SheetTitle>
          <SheetDescription>
            Enter the quantity received for each item.
          </SheetDescription>
        </SheetHeader>

        <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
          {/* Scrollable table */}
          <div className="flex-1 overflow-y-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="pl-4">Item</TableHead>
                  <TableHead className="w-28">Ordered</TableHead>
                  <TableHead className="w-32">Received</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={3} className="px-4 py-3">
                      <Skeleton className="h-8 w-full rounded-lg" />
                    </TableCell>
                  </TableRow>
                ) : receiveItems.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={3}
                      className="h-24 text-center text-muted-foreground"
                    >
                      No items found.
                    </TableCell>
                  </TableRow>
                ) : (
                  receiveItems.map((item, index) => (
                    <TableRow key={item.purchase_item_id}>
                      <TableCell className="pl-4 font-medium">
                        {item.inventory_item_name}
                      </TableCell>
                      <TableCell className="tabular-nums text-muted-foreground">
                        {Number(item.ordered_quantity).toLocaleString()}
                      </TableCell>
                      <TableCell className="pr-4">
                        <Input
                          type="number"
                          inputMode="decimal"
                          min="0"
                          step="0.0001"
                          value={item.received_quantity}
                          onChange={(e) => updateReceived(index, e.target.value)}
                          disabled={pending}
                        />
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </div>

        <div className="border-t" />

        {error && (
          <div className="px-4 pt-3">
            <FieldError>{error}</FieldError>
          </div>
        )}

        <SheetFooter>
          <Button
            type="button"
            onClick={handleSave}
            disabled={isLoading || pending}
            className="min-w-28"
          >
            {pending && <Spinner data-icon="inline-start" />}
            Confirm received
          </Button>
          <SheetClose asChild>
            <Button variant="outline" type="button" disabled={pending}>
              Cancel
            </Button>
          </SheetClose>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  )
}
