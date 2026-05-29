'use client'

import { useMemo, useState, useTransition } from 'react'
import { HistoryIcon, MinusIcon, PackageIcon, PlusIcon } from 'lucide-react'
import { setOrderPackagingQuantity } from '@/lib/actions/orders'
import type {
  OrderDetail,
  OrderPackagingEntry,
  PosCatalogPackagingItem,
} from '@/lib/types/orders'
import { formatAmount, formatDateTime } from '@/lib/order-format'
import { cn } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'
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
import { FieldError } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Spinner } from '@/components/ui/spinner'
import { Textarea } from '@/components/ui/textarea'

interface PackagingRow {
  packagingItemId: string
  name: string
  inventoryName: string
  quantity: number
  cogsImpact: number
  sortOrder: number
  configured: boolean
}

interface OrderPackagingSectionProps {
  kitchenId: string
  order: OrderDetail
  packagingItems: PosCatalogPackagingItem[]
  canUpdate: boolean
  canAction: boolean
  className?: string
  onChanged?: () => Promise<void> | void
}

function numeric(value: string | number | null | undefined) {
  if (value === null || value === undefined) return 0
  const n = typeof value === 'string' ? Number(value) : value
  return Number.isFinite(n) ? n : 0
}

function quantityLabel(value: number) {
  return value.toLocaleString('en-US', {
    maximumFractionDigits: 3,
  })
}

function inputQuantity(value: number) {
  return Number.isInteger(value) ? String(value) : String(Number(value.toFixed(3)))
}

function scopeMatchesSource(
  scope: PosCatalogPackagingItem['source_type_scope'],
  sourceType: string | null | undefined
) {
  if (scope === 'all') return true
  return sourceType?.toLowerCase() === scope
}

function buildRows(
  order: OrderDetail,
  packagingItems: PosCatalogPackagingItem[]
): PackagingRow[] {
  const rows = new Map<string, PackagingRow>()

  for (const item of packagingItems) {
    if (!scopeMatchesSource(item.source_type_scope, order.sources?.type)) continue
    rows.set(item.id, {
      packagingItemId: item.id,
      name: item.name,
      inventoryName: item.inventory_item?.name ?? item.inventory_item_id,
      quantity: 0,
      cogsImpact: 0,
      sortOrder: item.sort_order,
      configured: true,
    })
  }

  for (const entry of order.order_packaging_entries) {
    const existing = rows.get(entry.packaging_item_id)
    const quantity = numeric(entry.quantity_delta)
    const cogsImpact = numeric(entry.cogs_impact)

    if (existing) {
      existing.quantity += quantity
      existing.cogsImpact += cogsImpact
      continue
    }

    rows.set(entry.packaging_item_id, {
      packagingItemId: entry.packaging_item_id,
      name: entry.packaging_item_name_snapshot,
      inventoryName: entry.inventory_item_name_snapshot,
      quantity,
      cogsImpact,
      sortOrder: Number.MAX_SAFE_INTEGER,
      configured: false,
    })
  }

  return [...rows.values()].sort((a, b) => {
    if (a.sortOrder !== b.sortOrder) return a.sortOrder - b.sortOrder
    return a.name.localeCompare(b.name)
  })
}

function latestHistory(entries: OrderPackagingEntry[]) {
  return [...entries].sort(
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  )
}

function entryQuantityLabel(entry: OrderPackagingEntry) {
  const quantity = numeric(entry.quantity_delta)
  const sign = quantity > 0 ? '+' : ''
  return `${sign}${quantityLabel(quantity)}`
}

function isOrderVoided(order: OrderDetail) {
  return order.order_actions.some((action) => action.type === 'void')
}

export function OrderPackagingSection({
  kitchenId,
  order,
  packagingItems,
  canUpdate,
  canAction,
  className,
  onChanged,
}: OrderPackagingSectionProps) {
  const rows = useMemo(
    () => buildRows(order, packagingItems),
    [order, packagingItems]
  )
  const history = useMemo(
    () => latestHistory(order.order_packaging_entries),
    [order.order_packaging_entries]
  )
  const [target, setTarget] = useState<PackagingRow | null>(null)
  const [quantity, setQuantity] = useState('')
  const [reason, setReason] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()

  const voided = isOrderVoided(order)
  const completed = order.kitchen_status === 'completed'
  const canAdjust = !voided && (completed ? canAction : canUpdate)
  const reasonRequired = completed

  function openAdjust(row: PackagingRow) {
    setTarget(row)
    setQuantity(inputQuantity(row.quantity))
    setReason('')
    setError(null)
  }

  function bump(delta: number) {
    const current = Number(quantity || '0')
    const next = Math.max(0, (Number.isFinite(current) ? current : 0) + delta)
    setQuantity(inputQuantity(next))
  }

  function submit() {
    if (!target) return
    setError(null)
    const nextQuantity = Number(quantity)
    const trimmedReason = reason.trim()

    if (!Number.isFinite(nextQuantity) || nextQuantity < 0) {
      setError('Quantity must be 0 or greater.')
      return
    }

    if (reasonRequired && !trimmedReason) {
      setError('Reason is required for completed orders.')
      return
    }

    startTransition(async () => {
      const result = await setOrderPackagingQuantity(kitchenId, {
        orderId: order.id,
        packagingItemId: target.packagingItemId,
        quantity: nextQuantity,
        reason: trimmedReason || null,
      })

      if (result instanceof Error) {
        setError(result.message)
        return
      }

      await onChanged?.()
      setTarget(null)
      setQuantity('')
      setReason('')
    })
  }

  return (
    <section className={cn('space-y-3', className)}>
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <PackageIcon className="size-4 text-muted-foreground" />
          <h3 className="text-sm font-medium">Packaging</h3>
        </div>
        {voided ? (
          <Badge variant="outline">Voided</Badge>
        ) : completed ? (
          <Badge variant="outline">Reason required</Badge>
        ) : null}
      </div>

      <div className="divide-y rounded-lg border">
        {rows.length === 0 ? (
          <p className="p-3 text-center text-sm text-muted-foreground">
            No packaging configured.
          </p>
        ) : (
          rows.map((row) => (
            <div key={row.packagingItemId} className="flex items-center justify-between gap-3 px-3 py-2">
              <div className="min-w-0">
                <p className="truncate text-sm font-medium">{row.name}</p>
                <p className="truncate text-xs text-muted-foreground">
                  {row.inventoryName}
                  {!row.configured ? ' · archived config' : ''}
                </p>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                <div className="text-right">
                  <p className="text-sm font-medium tabular-nums">
                    {quantityLabel(row.quantity)}
                  </p>
                  <p className="text-xs text-muted-foreground tabular-nums">
                    {formatAmount(row.cogsImpact)}
                  </p>
                </div>
                {canAdjust ? (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => openAdjust(row)}
                  >
                    Set
                  </Button>
                ) : null}
              </div>
            </div>
          ))
        )}
      </div>

      {history.length > 0 ? (
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <HistoryIcon className="size-4 text-muted-foreground" />
            <h4 className="text-sm font-medium text-muted-foreground">History</h4>
          </div>
          <div className="divide-y rounded-lg border">
            {history.map((entry) => (
              <div key={entry.id} className="px-3 py-2">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm">{entry.packaging_item_name_snapshot}</p>
                    <p className="text-xs text-muted-foreground">
                      {entry.reason ??
                        entry.applied_member?.profiles?.full_name ??
                        formatDateTime(entry.created_at)}
                    </p>
                  </div>
                  <div className="shrink-0 text-right">
                    <p className="text-sm font-medium tabular-nums">
                      {entryQuantityLabel(entry)}
                    </p>
                    <p className="text-xs text-muted-foreground tabular-nums">
                      {formatAmount(entry.cogs_impact)}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : null}

      <Dialog
        open={target !== null}
        onOpenChange={(open) => {
          if (pending) return
          if (!open) setTarget(null)
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{target ? `Set ${target.name}` : 'Set packaging'}</DialogTitle>
            <DialogDescription>
              This records the difference as a packaging stock adjustment.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4">
            <div className="grid gap-2">
              <Label htmlFor="packaging-quantity">Quantity</Label>
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="icon-sm"
                  onClick={() => bump(-1)}
                  disabled={pending}
                >
                  <MinusIcon />
                </Button>
                <Input
                  id="packaging-quantity"
                  value={quantity}
                  onChange={(event) => setQuantity(event.target.value)}
                  inputMode="decimal"
                  className="text-center"
                  disabled={pending}
                />
                <Button
                  type="button"
                  variant="outline"
                  size="icon-sm"
                  onClick={() => bump(1)}
                  disabled={pending}
                >
                  <PlusIcon />
                </Button>
              </div>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="packaging-reason">
                Reason{reasonRequired ? '' : ' (optional)'}
              </Label>
              <Textarea
                id="packaging-reason"
                value={reason}
                onChange={(event) => setReason(event.target.value)}
                disabled={pending}
              />
            </div>
          </div>
          {error ? <FieldError>{error}</FieldError> : null}
          <DialogFooter>
            <Button type="button" onClick={submit} disabled={pending}>
              {pending ? <Spinner data-icon="inline-start" /> : null}
              Save
            </Button>
            <DialogClose asChild>
              <Button type="button" variant="outline" disabled={pending}>
                Cancel
              </Button>
            </DialogClose>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </section>
  )
}
