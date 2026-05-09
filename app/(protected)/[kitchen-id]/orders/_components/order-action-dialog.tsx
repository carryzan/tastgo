'use client'

import { useMemo, useState, useTransition } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { MinusIcon, PlusIcon } from 'lucide-react'
import { applyOrderAction, applyOrderDiscount } from '@/lib/actions/orders'
import type {
  DiscountType,
  OrderActionType,
  OrderDetail,
  OrderLine,
} from '@/lib/types/orders'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { FieldError } from '@/components/ui/field'
import { Spinner } from '@/components/ui/spinner'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/data-table/data-table-primitives'
import { ORDERS_QUERY_KEY } from '../_lib/queries'
import { formatAmount, orderActionLabel } from '@/components/shared/order-format'

interface OrderActionDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  kitchenId: string
  order: OrderDetail
  type: OrderActionType
  itemMode?: boolean
  title?: string
}

interface DiscountDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  kitchenId: string
  order: OrderDetail
}

function itemName(item: OrderLine) {
  return item.menu_item?.name ?? item.id.slice(0, 8)
}

function orderItemOptions(order: OrderDetail) {
  return order.order_items.filter((item) => Number(item.quantity) > 0)
}

export function OrderActionDialog({
  open,
  onOpenChange,
  kitchenId,
  order,
  type,
  itemMode = false,
  title,
}: OrderActionDialogProps) {
  const queryClient = useQueryClient()
  const [reason, setReason] = useState('')
  const [quantities, setQuantities] = useState<Record<string, string>>({})
  const [error, setError] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()
  const items = useMemo(() => orderItemOptions(order), [order])

  function reset() {
    setReason('')
    setQuantities({})
    setError(null)
  }

  function updateQuantity(itemId: string, value: string) {
    setQuantities((prev) => ({ ...prev, [itemId]: value }))
  }

  function bump(item: OrderLine, delta: number) {
    const current = Number(quantities[item.id] ?? '0')
    const max = Number(item.quantity)
    const next = Math.min(max, Math.max(0, current + delta))
    updateQuantity(item.id, next > 0 ? String(next) : '')
  }

  function submit() {
    setError(null)
    const selectedItems = itemMode
      ? items.flatMap((item) => {
          const raw = quantities[item.id]
          const value = raw ? Number(raw) : 0
          if (!Number.isFinite(value) || value <= 0) return []
          return [{ order_item_id: item.id, quantity: value }]
        })
      : []

    if (itemMode && selectedItems.length === 0) {
      setError('Select at least one item quantity.')
      return
    }

    startTransition(async () => {
      const result = await applyOrderAction(
        kitchenId,
        order.id,
        type,
        reason.trim() || null,
        selectedItems
      )
      if (result instanceof Error) {
        setError(result.message)
        return
      }
      await queryClient.invalidateQueries({ queryKey: ORDERS_QUERY_KEY })
      await queryClient.invalidateQueries({ queryKey: ['order-detail', order.id] })
      reset()
      onOpenChange(false)
    })
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (pending) return
        if (!next) reset()
        onOpenChange(next)
      }}
    >
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{title ?? orderActionLabel(type)}</DialogTitle>
          <DialogDescription>
            This records an order action and keeps the original order intact.
          </DialogDescription>
        </DialogHeader>

        {itemMode ? (
          <div className="max-h-72 overflow-auto rounded-lg border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Item</TableHead>
                  <TableHead className="w-24">Ordered</TableHead>
                  <TableHead className="w-36">Action Qty</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell>
                      <div className="flex flex-col gap-0.5">
                        <span className="font-medium">{itemName(item)}</span>
                        <span className="text-xs text-muted-foreground">
                          {formatAmount(item.line_total)}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>{formatAmount(item.quantity)}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Button
                          type="button"
                          variant="outline"
                          size="icon-sm"
                          onClick={() => bump(item, -1)}
                          disabled={pending}
                        >
                          <MinusIcon />
                        </Button>
                        <Input
                          value={quantities[item.id] ?? ''}
                          onChange={(event) => updateQuantity(item.id, event.target.value)}
                          inputMode="decimal"
                          className="h-7 w-16 text-center"
                          disabled={pending}
                        />
                        <Button
                          type="button"
                          variant="outline"
                          size="icon-sm"
                          onClick={() => bump(item, 1)}
                          disabled={pending}
                        >
                          <PlusIcon />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        ) : null}

        <div className="grid gap-2">
          <Label htmlFor="order-action-reason">Reason</Label>
          <Textarea
            id="order-action-reason"
            value={reason}
            onChange={(event) => setReason(event.target.value)}
            placeholder="Optional"
            disabled={pending}
          />
        </div>

        {error ? <FieldError>{error}</FieldError> : null}

        <DialogFooter>
          <Button type="button" onClick={submit} disabled={pending}>
            {pending ? <Spinner data-icon="inline-start" /> : null}
            Apply
          </Button>
          <DialogClose asChild>
            <Button variant="outline" type="button" disabled={pending}>
              Cancel
            </Button>
          </DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export function DiscountDialog({
  open,
  onOpenChange,
  kitchenId,
  order,
}: DiscountDialogProps) {
  const queryClient = useQueryClient()
  const [type, setType] = useState<DiscountType>('fixed')
  const [amount, setAmount] = useState('')
  const [reason, setReason] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()

  function reset() {
    setType('fixed')
    setAmount('')
    setReason('')
    setError(null)
  }

  function submit() {
    setError(null)
    const value = Number(amount)
    if (!Number.isFinite(value) || value <= 0) {
      setError('Enter a discount greater than zero.')
      return
    }
    if (type === 'percentage' && value > 100) {
      setError('Percentage discount cannot exceed 100.')
      return
    }

    startTransition(async () => {
      const result = await applyOrderDiscount(kitchenId, {
        orderId: order.id,
        type,
        amount: type === 'fixed' ? value : null,
        percentage: type === 'percentage' ? value : null,
        reason: reason.trim() || null,
      })
      if (result instanceof Error) {
        setError(result.message)
        return
      }
      await queryClient.invalidateQueries({ queryKey: ORDERS_QUERY_KEY })
      await queryClient.invalidateQueries({ queryKey: ['order-detail', order.id] })
      reset()
      onOpenChange(false)
    })
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (pending) return
        if (!next) reset()
        onOpenChange(next)
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Apply discount</DialogTitle>
          <DialogDescription>
            Add a whole-order discount before the order is completed.
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-2 gap-2">
          <Button
            type="button"
            variant={type === 'fixed' ? 'default' : 'outline'}
            onClick={() => setType('fixed')}
            disabled={pending}
          >
            Fixed
          </Button>
          <Button
            type="button"
            variant={type === 'percentage' ? 'default' : 'outline'}
            onClick={() => setType('percentage')}
            disabled={pending}
          >
            Percentage
          </Button>
        </div>

        <div className="grid gap-2">
          <Label htmlFor="discount-amount">
            {type === 'fixed' ? 'Amount' : 'Percentage'}
          </Label>
          <Input
            id="discount-amount"
            value={amount}
            onChange={(event) => setAmount(event.target.value)}
            inputMode="decimal"
            placeholder={type === 'fixed' ? '0.00' : '0'}
            disabled={pending}
          />
        </div>

        <div className="grid gap-2">
          <Label htmlFor="discount-reason">Reason</Label>
          <Textarea
            id="discount-reason"
            value={reason}
            onChange={(event) => setReason(event.target.value)}
            placeholder="Optional"
            disabled={pending}
          />
        </div>

        {error ? <FieldError>{error}</FieldError> : null}

        <DialogFooter>
          <Button type="button" onClick={submit} disabled={pending}>
            {pending ? <Spinner data-icon="inline-start" /> : null}
            Apply discount
          </Button>
          <DialogClose asChild>
            <Button type="button" variant="outline" disabled={pending}>
              Cancel
            </Button>
          </DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
