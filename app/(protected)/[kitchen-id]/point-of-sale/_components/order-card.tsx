'use client'

import Image from 'next/image'
import { TagIcon } from 'lucide-react'
import { useEffect, useState } from 'react'

import {
  Item,
  ItemContent,
  ItemDescription,
  ItemMedia,
  ItemTitle,
} from '@/components/ui/item'
import { formatAmount, orderActionLabel } from '@/lib/order-format'
import { cn } from '@/lib/utils'
import type { OrderActionType, OrderRow } from '@/lib/types/orders'

const statusTagClass =
  'inline-flex items-center justify-center rounded-sm border border-current px-1.5 py-0.5 text-xs font-medium leading-none'

function distinctActionTypes(
  actions: { type: OrderActionType }[] | null | undefined
): OrderActionType[] {
  if (!actions?.length) return []
  const seen = new Set<OrderActionType>()
  const types: OrderActionType[] = []
  for (const row of actions) {
    if (!seen.has(row.type)) {
      seen.add(row.type)
      types.push(row.type)
    }
  }
  const rank: Record<OrderActionType, number> = {
    void: 0,
    refund: 1,
    full_comp: 2,
    partial_comp: 3,
  }
  types.sort((a, b) => rank[a] - rank[b])
  return types
}

function actionTypeStatusClass(type: OrderActionType): string {
  switch (type) {
    case 'void':
      return 'text-destructive'
    case 'refund':
      return 'text-amber-600 dark:text-amber-400'
    case 'full_comp':
      return 'text-violet-600 dark:text-violet-400'
    case 'partial_comp':
      return 'text-blue-600 dark:text-blue-400'
    default:
      return ''
  }
}

function LogoThumb({
  url,
  label,
  size,
}: {
  url: string | null | undefined
  label: string
  size: 32 | 20 | 12
}) {
  const dimension = size === 32 ? 32 : size === 20 ? 20 : 12
  if (url) {
    return (
      <Image
        src={url}
        alt=""
        width={dimension}
        height={dimension}
        className={cn(
          'object-cover',
          size === 32 && 'size-8 rounded-lg',
          size === 20 && 'size-5 rounded-lg',
          size === 12 && 'size-3 rounded-full'
        )}
      />
    )
  }
  const initial = label.trim().slice(0, 1).toUpperCase() || '?'
  return (
    <span
      className={cn(
        'flex shrink-0 items-center justify-center bg-muted font-medium text-muted-foreground',
        size === 32 && 'size-8 rounded-lg text-xs',
        size === 20 && 'size-5 rounded-lg text-[10px]',
        size === 12 && 'size-3 rounded-full text-[8px]'
      )}
      aria-hidden
    >
      {initial}
    </span>
  )
}

function formatElapsedSeconds(totalSeconds: number) {
  const sec = Math.max(0, Math.floor(totalSeconds))
  const h = Math.floor(sec / 3600)
  const m = Math.floor((sec % 3600) / 60)
  const s = sec % 60
  if (h > 0) {
    return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
  }
  return `${m}:${String(s).padStart(2, '0')}`
}

function OrderTimer({
  kitchenStatus,
  createdAt,
}: {
  kitchenStatus: OrderRow['kitchen_status']
  createdAt: string
}) {
  const [now, setNow] = useState(() => Date.now())

  useEffect(() => {
    if (kitchenStatus !== 'preparing') return
    const id = setInterval(() => {
      setNow(Date.now())
    }, 1000)
    return () => clearInterval(id)
  }, [kitchenStatus])

  if (kitchenStatus === 'preparing') {
    const startMs = new Date(createdAt).getTime()
    const elapsedSec = (now - startMs) / 1000
    return (
      <span
        className={cn(
          statusTagClass,
          'tabular-nums text-muted-foreground'
        )}
      >
        {formatElapsedSeconds(elapsedSec)}
      </span>
    )
  }

  if (kitchenStatus === 'ready') {
    return (
      <span className={cn(statusTagClass, 'text-sky-600 dark:text-sky-400')}>
        Ready
      </span>
    )
  }

  return (
    <span className={cn(statusTagClass, 'text-emerald-600 dark:text-emerald-400')}>
      Completed
    </span>
  )
}

function OrderStatusSlot({ order }: { order: OrderRow }) {
  const actionTypes = distinctActionTypes(order.order_actions)
  if (actionTypes.length > 0) {
    return (
      <span className="flex max-w-52 flex-wrap items-center justify-center gap-1">
        {actionTypes.map((type) => (
          <span
            key={type}
            className={cn(statusTagClass, actionTypeStatusClass(type))}
          >
            {orderActionLabel(type)}
          </span>
        ))}
      </span>
    )
  }
  return <OrderTimer kitchenStatus={order.kitchen_status} createdAt={order.created_at} />
}

function OrderSummaryParts({ order }: { order: OrderRow }) {
  const sourceName = order.sources?.name ?? '-'
  const brandName = order.brands?.name ?? '-'

  return (
    <>
      <ItemMedia variant="image" className="rounded-lg">
        <LogoThumb url={order.sources?.logo_url} label={sourceName} size={32} />
      </ItemMedia>
      <ItemContent>
        <ItemTitle className="line-clamp-1">
          {sourceName}{' '}
          <span className="text-muted-foreground">#{order.order_number}</span>
        </ItemTitle>
        <ItemDescription className="line-clamp-none!">
          <span className="flex flex-wrap items-center gap-1">
            <span className="inline-flex items-center gap-1 text-xs font-normal">
              <LogoThumb url={order.brands?.logo_url} label={brandName} size={12} />
              {brandName}
            </span>
            <span className="inline-flex items-center gap-1 text-xs font-normal">
              <TagIcon className="size-3 shrink-0" aria-hidden />
              {formatAmount(order.net_amount)}
            </span>
          </span>
        </ItemDescription>
      </ItemContent>
      <ItemContent className="flex-none text-center">
        <ItemDescription>
          <OrderStatusSlot order={order} />
        </ItemDescription>
      </ItemContent>
    </>
  )
}

export function OrderPanelHeader({ order }: { order: OrderRow }) {
  return (
    <Item variant="default" className="w-full border-transparent px-0 py-0 shadow-none">
      <OrderSummaryParts order={order} />
    </Item>
  )
}

export function OrderCard({
  order,
  active,
  onClick,
}: {
  order: OrderRow
  active: boolean
  onClick: () => void
}) {
  return (
    <Item
      asChild
      variant="default"
      role="listitem"
      className={cn('hover:bg-muted', active && 'bg-muted')}
    >
      <button type="button" onClick={onClick}>
        <OrderSummaryParts order={order} />
      </button>
    </Item>
  )
}
