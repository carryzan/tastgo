'use client'

import { useMemo, useState, useTransition } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { CheckIcon, ChevronDownIcon } from 'lucide-react'
import { useKitchen } from '@/hooks/use-kitchen'
import { SiteHeader } from '@/components/layout/site-header'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible'
import { FieldError } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { Spinner } from '@/components/ui/spinner'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/data-table/data-table-primitives'
import {
  completeStockCount,
  updateStockCountItem,
} from '../_lib/actions'
import type {
  StockCountDetailItem,
  StockCountSessionDetail,
} from '../_lib/detail-queries'

interface StockCountDetailProps {
  kitchenId: string
  session: StockCountSessionDetail
  items: StockCountDetailItem[]
}

interface EditableStockCountItem extends StockCountDetailItem {
  draftQuantity: string
  draftReason: string
}

interface UpdatedItemFields {
  id: string
  counted_quantity: string | number
  theoretical_quantity: string | number
  variance_quantity: string | number
  variance_direction: 'negative' | 'positive' | 'none'
  variance_value: string | number
  adjustment_reason: string | null
  counted_at: string | null
  counted_by: string | null
}

function formatNumber(value: string | number | null) {
  if (value == null) return '-'
  const n = Number(value)
  if (Number.isNaN(n)) return '-'
  return n.toLocaleString(undefined, { maximumFractionDigits: 4 })
}

function formatMoney(value: string | number | null) {
  if (value == null) return '-'
  const n = Number(value)
  if (Number.isNaN(n)) return '-'
  return n.toLocaleString(undefined, { maximumFractionDigits: 3 })
}

function formatDate(value: string | null) {
  if (!value) return '-'
  return new Date(value).toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })
}

function cycleLabel(value: string | null) {
  if (!value) return '-'
  return value
    .split('_')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ')
}

function memberName(
  member: { profiles: { full_name: string | null } | null } | null
) {
  return member?.profiles?.full_name ?? '-'
}

function toEditable(item: StockCountDetailItem): EditableStockCountItem {
  return {
    ...item,
    draftQuantity: String(item.counted_quantity),
    draftReason: item.adjustment_reason ?? '',
  }
}

function isUpdatedItemFields(value: unknown): value is UpdatedItemFields {
  if (!value || typeof value !== 'object') return false
  return 'id' in value && 'counted_quantity' in value
}

export function StockCountDetail({
  kitchenId,
  session,
  items: initialItems,
}: StockCountDetailProps) {
  const { permissions } = useKitchen()
  const router = useRouter()
  const [items, setItems] = useState(() => initialItems.map(toEditable))
  const [savingId, setSavingId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [completePending, startCompleteTransition] = useTransition()

  const isReadOnly =
    session.status === 'completed' || !permissions.has('stock_count.update')
  const groupedItems = useMemo(() => {
    const groups = new Map<string, EditableStockCountItem[]>()
    for (const item of items) {
      const group = item.stock?.group_label ?? 'Unassigned'
      const existing = groups.get(group) ?? []
      existing.push(item)
      groups.set(group, existing)
    }
    return Array.from(groups.entries()).sort(([a], [b]) => a.localeCompare(b))
  }, [items])

  const countedCount = items.filter((item) => item.counted_at).length
  const allCounted = items.length > 0 && countedCount === items.length

  function updateDraft(
    itemId: string,
    patch: Partial<Pick<EditableStockCountItem, 'draftQuantity' | 'draftReason'>>
  ) {
    setItems((prev) =>
      prev.map((item) =>
        item.id === itemId ? { ...item, ...patch } : item
      )
    )
  }

  async function saveItem(item: EditableStockCountItem) {
    setError(null)
    const quantity = Number(item.draftQuantity)
    if (Number.isNaN(quantity) || quantity < 0) {
      setError('Counted quantity must be 0 or greater.')
      return
    }

    setSavingId(item.id)
    try {
      const result = await updateStockCountItem(
        kitchenId,
        item.id,
        quantity,
        item.draftReason.trim() || null
      )
      if (result instanceof Error) {
        setError(result.message)
        return
      }
      if (!isUpdatedItemFields(result)) {
        setError('Unable to save count item.')
        return
      }

      setItems((prev) =>
        prev.map((row) =>
          row.id === item.id
            ? {
                ...row,
                counted_quantity: result.counted_quantity,
                theoretical_quantity: result.theoretical_quantity,
                variance_quantity: result.variance_quantity,
                variance_direction: result.variance_direction,
                variance_value: result.variance_value,
                adjustment_reason: result.adjustment_reason,
                counted_at: result.counted_at,
                counted_by: result.counted_by,
                draftQuantity: String(result.counted_quantity),
                draftReason: result.adjustment_reason ?? '',
              }
            : row
        )
      )
    } catch {
      setError('Something went wrong. Please try again.')
    } finally {
      setSavingId(null)
    }
  }

  function handleComplete() {
    setError(null)
    if (!allCounted) {
      setError('All items must be counted before completing.')
      return
    }

    startCompleteTransition(async () => {
      try {
        const result = await completeStockCount(kitchenId, session.id)
        if (result instanceof Error) {
          setError(result.message)
          return
        }
        router.refresh()
      } catch {
        setError('Something went wrong. Please try again.')
      }
    })
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <SiteHeader title="Stock Count">
        <div className="ml-auto flex min-w-0 items-center gap-1">
          <Button variant="outline" size="sm" asChild>
            <Link href={`/${kitchenId}/stock-control`}>Back</Link>
          </Button>
          {!isReadOnly && (
            <Button
              size="sm"
              onClick={handleComplete}
              disabled={!allCounted || completePending}
              className="min-w-28"
            >
              {completePending && <Spinner data-icon="inline-start" />}
              Complete
            </Button>
          )}
        </div>
      </SiteHeader>

      <div className="border-b px-4 py-3">
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant={session.status === 'completed' ? 'default' : 'secondary'}>
            {session.status === 'completed' ? 'Completed' : 'In Progress'}
          </Badge>
          <Badge variant="outline">
            {session.type === 'full' ? 'Full' : 'Spot'}
          </Badge>
          <span className="text-sm text-muted-foreground">
            Created {formatDate(session.created_at)} by{' '}
            {memberName(session.created_member)}
          </span>
          {session.completed_at && (
            <span className="text-sm text-muted-foreground">
              Completed {formatDate(session.completed_at)} by{' '}
              {memberName(session.completed_member)}
            </span>
          )}
          <span className="ml-auto text-sm text-muted-foreground">
            {countedCount}/{items.length} counted
          </span>
        </div>
        {error && <FieldError className="mt-2">{error}</FieldError>}
      </div>

      <div className="min-h-0 flex-1 overflow-auto">
        <div className="flex flex-col">
          {groupedItems.map(([group, groupItems]) => {
            const groupCounted = groupItems.filter((item) => item.counted_at).length
            const varianceValue = groupItems.reduce(
              (sum, item) =>
                item.counted_at ? sum + Number(item.variance_value) : sum,
              0
            )

            return (
              <Collapsible key={group} defaultOpen>
                <CollapsibleTrigger className="group flex w-full items-center gap-3 border-b bg-muted/30 px-4 py-2 text-left">
                  <ChevronDownIcon className="size-4 transition-transform group-data-[state=closed]:-rotate-90" />
                  <div className="flex min-w-0 flex-1 items-center gap-3">
                    <span className="truncate text-sm font-medium">{group}</span>
                    <span className="text-xs text-muted-foreground">
                      {groupCounted}/{groupItems.length} counted
                    </span>
                    <span className="text-xs text-muted-foreground">
                      Variance value {formatMoney(varianceValue)}
                    </span>
                  </div>
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Item</TableHead>
                          <TableHead>Cycle</TableHead>
                          <TableHead>Par</TableHead>
                          <TableHead>Theoretical</TableHead>
                          <TableHead className="w-36">Counted</TableHead>
                          <TableHead>Variance</TableHead>
                          <TableHead className="w-56">Reason</TableHead>
                          <TableHead className="w-24" />
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {groupItems.map((item) => {
                          const dirty =
                            item.counted_at === null ||
                            item.draftQuantity !== String(item.counted_quantity) ||
                            item.draftReason !== (item.adjustment_reason ?? '')
                          const uom = item.stock?.count_uom_label
                          const missingInventoryUom =
                            item.stock?.item_type === 'inventory_item' && !uom
                          return (
                            <TableRow key={item.id}>
                              <TableCell>
                                <div className="flex min-w-48 flex-col">
                                  <span className="font-medium">
                                    {item.stock?.name ?? 'Unknown item'}
                                  </span>
                                  <span className="text-xs text-muted-foreground">
                                    {item.stock?.item_type === 'production_recipe'
                                      ? 'Production'
                                      : item.stock?.category_name ?? 'Inventory'}
                                  </span>
                                </div>
                              </TableCell>
                              <TableCell>{cycleLabel(item.stock?.cycle_count_frequency ?? null)}</TableCell>
                              <TableCell>
                                <div className="flex flex-col text-xs">
                                  <span>Min {formatNumber(item.stock?.min_level ?? null)}</span>
                                  <span>Par {formatNumber(item.stock?.par_level ?? null)}</span>
                                  <span>Max {formatNumber(item.stock?.max_level ?? null)}</span>
                                </div>
                              </TableCell>
                              <TableCell>
                                <span className="font-mono">
                                  {formatNumber(item.theoretical_quantity)} {uom ?? ''}
                                </span>
                              </TableCell>
                              <TableCell>
                                <div className="flex items-center gap-2">
                                  <Input
                                    value={item.draftQuantity}
                                    onChange={(e) =>
                                      updateDraft(item.id, {
                                        draftQuantity: e.target.value,
                                      })
                                    }
                                    type="number"
                                    min="0"
                                    step="0.0001"
                                    disabled={isReadOnly || savingId === item.id}
                                    className="w-28"
                                  />
                                  {uom ? (
                                    <span className="text-xs text-muted-foreground">
                                      {uom}
                                    </span>
                                  ) : missingInventoryUom ? (
                                    <Badge variant="outline">No UOM</Badge>
                                  ) : (
                                    <span className="text-xs text-muted-foreground">
                                      -
                                    </span>
                                  )}
                                </div>
                              </TableCell>
                              <TableCell>
                                <div className="flex flex-col">
                                  <span className="font-mono">
                                    {item.counted_at
                                      ? formatNumber(item.variance_quantity)
                                      : '-'}
                                  </span>
                                  <span className="text-xs text-muted-foreground">
                                    {item.counted_at
                                      ? formatMoney(item.variance_value)
                                      : 'Not counted'}
                                  </span>
                                </div>
                              </TableCell>
                              <TableCell>
                                <Input
                                  value={item.draftReason}
                                  onChange={(e) =>
                                    updateDraft(item.id, {
                                      draftReason: e.target.value,
                                    })
                                  }
                                  disabled={isReadOnly || savingId === item.id}
                                  placeholder="-"
                                />
                              </TableCell>
                              <TableCell>
                                {!isReadOnly && (
                                  <Button
                                    size="sm"
                                    variant={item.counted_at ? 'outline' : 'default'}
                                    onClick={() => saveItem(item)}
                                    disabled={!dirty || savingId === item.id}
                                    className="min-w-20"
                                  >
                                    {savingId === item.id ? (
                                      <Spinner data-icon="inline-start" />
                                    ) : (
                                      item.counted_at && <CheckIcon />
                                    )}
                                    Save
                                  </Button>
                                )}
                              </TableCell>
                            </TableRow>
                          )
                        })}
                      </TableBody>
                    </Table>
                  </div>
                </CollapsibleContent>
              </Collapsible>
            )
          })}
        </div>
      </div>
    </div>
  )
}
