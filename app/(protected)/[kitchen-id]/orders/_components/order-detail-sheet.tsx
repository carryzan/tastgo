'use client'

import { useMemo, useState, useTransition } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import {
  BadgeDollarSignIcon,
  CheckCircle2Icon,
  CircleDollarSignIcon,
  GiftIcon,
  PercentIcon,
  Undo2Icon,
} from 'lucide-react'
import { updateOrderStatus } from '@/lib/actions/orders'
import type { OrderActionType, OrderDetail, OrderRow } from '@/lib/types/orders'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Spinner } from '@/components/ui/spinner'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import { FieldError } from '@/components/ui/field'
import { fetchOrderDetail } from '@/lib/supabase/queries/order-details'
import { ORDERS_QUERY_KEY } from '../_lib/queries'
import {
  formatAmount,
  formatDateTime,
  kitchenStatusLabel,
  orderActionLabel,
  paymentStatusLabel,
} from '@/components/shared/order-format'
import { DiscountDialog, OrderActionDialog } from './order-action-dialog'

interface OrderDetailSheetProps {
  order: OrderRow | null
  open: boolean
  onOpenChange: (open: boolean) => void
  kitchenId: string
  canUpdate: boolean
  canAction: boolean
}

type ActionDialogState =
  | { type: OrderActionType; itemMode?: boolean; title?: string }
  | null

function InfoRow({
  label,
  value,
}: {
  label: string
  value: React.ReactNode
}) {
  return (
    <div className="flex items-center justify-between gap-3 py-2">
      <span className="text-sm text-muted-foreground">{label}</span>
      <span className="text-right text-sm font-medium">{value}</span>
    </div>
  )
}

function OrderStatusBadges({ order }: { order: OrderDetail | OrderRow }) {
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      <Badge variant="secondary">{kitchenStatusLabel(order.kitchen_status)}</Badge>
      <Badge variant={order.payment_status === 'paid' ? 'default' : 'outline'}>
        {paymentStatusLabel(order.payment_status)}
      </Badge>
      {order.sources?.settlement_mode ? (
        <Badge variant="outline">{order.sources.settlement_mode}</Badge>
      ) : null}
    </div>
  )
}

export function OrderDetailSheet({
  order,
  open,
  onOpenChange,
  kitchenId,
  canUpdate,
  canAction,
}: OrderDetailSheetProps) {
  const queryClient = useQueryClient()
  const [actionDialog, setActionDialog] = useState<ActionDialogState>(null)
  const [discountOpen, setDiscountOpen] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [pendingStatus, startStatusTransition] = useTransition()

  const orderId = order?.id ?? ''
  const { data, isLoading } = useQuery({
    queryKey: ['order-detail', orderId],
    queryFn: () => fetchOrderDetail(orderId),
    enabled: open && !!orderId,
  })

  const detail = data ?? order
  const isCompleted = detail?.kitchen_status === 'completed'
  const isPreparing = detail?.kitchen_status === 'preparing'
  const isReady = detail?.kitchen_status === 'ready'
  const settlementMode = detail?.sources?.settlement_mode ?? null
  const canDiscount = Boolean(canUpdate && detail && !isCompleted)
  const canVoid = Boolean(canAction && detail && !isCompleted)
  const canRefund = Boolean(
    canAction &&
      detail &&
      isCompleted &&
      detail.payment_status === 'paid' &&
      settlementMode === 'cash_now'
  )
  const canComp = Boolean(
    canAction && detail && isCompleted && settlementMode === 'marketplace_receivable'
  )

  const totals = useMemo(() => {
    if (!data) return []
    return [
      ['Gross', formatAmount(data.gross_amount)],
      ['Discounts', formatAmount(data.discount_amount)],
      ['Net', formatAmount(data.net_amount)],
      ['Commission', formatAmount(data.commission_amount)],
      ['Platform deductions', formatAmount(data.total_platform_deductions)],
      ['Kitchen revenue', formatAmount(data.net_revenue_to_kitchen)],
    ] as const
  }, [data])

  function moveStatus(nextStatus: 'ready' | 'completed') {
    if (!detail) return
    setError(null)
    startStatusTransition(async () => {
      const result = await updateOrderStatus(kitchenId, detail.id, nextStatus)
      if (result instanceof Error) {
        setError(result.message)
        return
      }
      await queryClient.invalidateQueries({ queryKey: ORDERS_QUERY_KEY })
      await queryClient.invalidateQueries({ queryKey: ['order-detail', detail.id] })
    })
  }

  return (
    <>
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent className="flex flex-col gap-0 p-0 sm:max-w-3xl">
          <SheetHeader className="border-b px-4 py-4">
            <SheetTitle>
              {detail ? `Order #${detail.order_number}` : 'Order details'}
            </SheetTitle>
            <SheetDescription asChild>
              {detail ? <OrderStatusBadges order={detail} /> : <span>Loading</span>}
            </SheetDescription>
          </SheetHeader>

          <div className="min-h-0 flex-1 overflow-y-auto">
            {isLoading || !detail ? (
              <div className="flex h-40 items-center justify-center">
                <Spinner />
              </div>
            ) : (
              <div className="divide-y">
                <section className="px-4 py-4">
                  <div className="grid gap-0 divide-y rounded-lg border px-3 md:grid-cols-2 md:divide-x md:divide-y-0">
                    <div className="md:pr-3">
                      <InfoRow label="Brand" value={detail.brands?.name ?? '-'} />
                      <InfoRow label="Source" value={detail.sources?.name ?? '-'} />
                      <InfoRow label="Created" value={formatDateTime(detail.created_at)} />
                    </div>
                    <div className="md:pl-3">
                      <InfoRow label="Source code" value={detail.source_order_code ?? '-'} />
                      <InfoRow label="Settlement" value={detail.sources?.settlement_mode ?? '-'} />
                      <InfoRow label="Settlement batch" value={detail.online_settlement_id ? 'Linked' : '-'} />
                    </div>
                  </div>
                </section>

                {data ? (
                  <>
                    <section className="px-4 py-4">
                      <div className="mb-3 flex items-center justify-between">
                        <h3 className="text-sm font-medium">Items</h3>
                        <span className="text-xs text-muted-foreground">
                          {data.order_items.length} lines
                        </span>
                      </div>
                      <div className="divide-y rounded-lg border">
                        {data.order_items.length === 0 ? (
                          <p className="p-4 text-center text-sm text-muted-foreground">
                            No items.
                          </p>
                        ) : (
                          data.order_items.map((item) => (
                            <div key={item.id} className="px-3 py-3">
                              <div className="flex items-start justify-between gap-3">
                                <div>
                                  <p className="text-sm font-medium">
                                    {item.menu_item?.name ?? item.id.slice(0, 8)}
                                  </p>
                                  <p className="text-xs text-muted-foreground">
                                    Qty {formatAmount(item.quantity)} x {formatAmount(item.unit_price)}
                                    {item.pricing_source === 'combo_allocated' ? ' · combo allocated' : ''}
                                  </p>
                                </div>
                                <p className="text-sm font-medium">
                                  {formatAmount(item.line_total)}
                                </p>
                              </div>
                              {item.order_item_modifiers.length > 0 ? (
                                <div className="mt-2 space-y-1 pl-3">
                                  {item.order_item_modifiers.map((modifier) => (
                                    <div
                                      key={modifier.id}
                                      className="flex items-center justify-between text-xs text-muted-foreground"
                                    >
                                      <span>
                                        {modifier.modifier_option?.name ?? modifier.modifier_option_id}
                                        {' x '}
                                        {formatAmount(modifier.quantity)}
                                      </span>
                                      <span>{formatAmount(modifier.price_impact)}</span>
                                    </div>
                                  ))}
                                </div>
                              ) : null}
                            </div>
                          ))
                        )}
                      </div>
                    </section>

                    <section className="px-4 py-4">
                      <div className="mb-3 flex items-center justify-between">
                        <h3 className="text-sm font-medium">Financials</h3>
                      </div>
                      <div className="divide-y rounded-lg border px-3">
                        {totals.map(([label, value]) => (
                          <InfoRow key={label} label={label} value={value} />
                        ))}
                      </div>
                    </section>

                    <section className="px-4 py-4">
                      <div className="mb-3 flex items-center justify-between">
                        <h3 className="text-sm font-medium">Discounts</h3>
                        <span className="text-xs text-muted-foreground">
                          {data.order_discounts.length} records
                        </span>
                      </div>
                      <div className="divide-y rounded-lg border">
                        {data.order_discounts.length === 0 ? (
                          <p className="p-4 text-center text-sm text-muted-foreground">
                            No discounts.
                          </p>
                        ) : (
                          data.order_discounts.map((discount) => (
                            <div key={discount.id} className="flex items-center justify-between px-3 py-3">
                              <div>
                                <p className="text-sm font-medium capitalize">
                                  {discount.type}
                                </p>
                                <p className="text-xs text-muted-foreground">
                                  {discount.reason ?? formatDateTime(discount.created_at)}
                                </p>
                              </div>
                              <p className="text-sm font-medium">{formatAmount(discount.amount)}</p>
                            </div>
                          ))
                        )}
                      </div>
                    </section>

                    <section className="px-4 py-4">
                      <div className="mb-3 flex items-center justify-between">
                        <h3 className="text-sm font-medium">Actions</h3>
                        <span className="text-xs text-muted-foreground">
                          {data.order_actions.length} records
                        </span>
                      </div>
                      <div className="divide-y rounded-lg border">
                        {data.order_actions.length === 0 ? (
                          <p className="p-4 text-center text-sm text-muted-foreground">
                            No actions.
                          </p>
                        ) : (
                          data.order_actions.map((action) => (
                            <div key={action.id} className="px-3 py-3">
                              <div className="flex items-start justify-between gap-3">
                                <div>
                                  <p className="text-sm font-medium">
                                    {orderActionLabel(action.type)}
                                  </p>
                                  <p className="text-xs text-muted-foreground">
                                    {action.reason ?? formatDateTime(action.created_at)}
                                  </p>
                                </div>
                                <p className="text-sm font-medium">
                                  {formatAmount(action.action_amount)}
                                </p>
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                    </section>
                  </>
                ) : null}
              </div>
            )}
          </div>

          <div className="border-t px-4 py-3">
            {error ? <FieldError className="mb-2">{error}</FieldError> : null}
            {detail ? (
              <div className="flex flex-wrap items-center justify-end gap-2">
                {canUpdate && isPreparing ? (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => moveStatus('ready')}
                    disabled={pendingStatus}
                  >
                    <CheckCircle2Icon />
                    Mark ready
                  </Button>
                ) : null}
                {canUpdate && isReady ? (
                  <Button
                    type="button"
                    size="sm"
                    onClick={() => moveStatus('completed')}
                    disabled={pendingStatus}
                  >
                    <CheckCircle2Icon />
                    Complete
                  </Button>
                ) : null}
                {canDiscount ? (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setDiscountOpen(true)}
                  >
                    <PercentIcon />
                    Discount
                  </Button>
                ) : null}
                {canVoid ? (
                  <Button
                    type="button"
                    variant="destructive"
                    size="sm"
                    onClick={() => setActionDialog({ type: 'void' })}
                  >
                    <Undo2Icon />
                    Void
                  </Button>
                ) : null}
                {canRefund ? (
                  <>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setActionDialog({ type: 'refund', title: 'Full refund' })}
                    >
                      <CircleDollarSignIcon />
                      Full refund
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() =>
                        setActionDialog({
                          type: 'refund',
                          itemMode: true,
                          title: 'Partial refund',
                        })
                      }
                    >
                      <BadgeDollarSignIcon />
                      Partial refund
                    </Button>
                  </>
                ) : null}
                {canComp ? (
                  <>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setActionDialog({ type: 'full_comp' })}
                    >
                      <GiftIcon />
                      Full comp
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() =>
                        setActionDialog({
                          type: 'partial_comp',
                          itemMode: true,
                          title: 'Partial comp',
                        })
                      }
                    >
                      <GiftIcon />
                      Partial comp
                    </Button>
                  </>
                ) : null}
                {pendingStatus ? <Spinner /> : null}
              </div>
            ) : null}
          </div>
        </SheetContent>
      </Sheet>

      {data && actionDialog ? (
        <OrderActionDialog
          open={actionDialog !== null}
          onOpenChange={(next) => {
            if (!next) setActionDialog(null)
          }}
          kitchenId={kitchenId}
          order={data}
          type={actionDialog.type}
          itemMode={actionDialog.itemMode}
          title={actionDialog.title}
        />
      ) : null}

      {data ? (
        <DiscountDialog
          open={discountOpen}
          onOpenChange={setDiscountOpen}
          kitchenId={kitchenId}
          order={data}
        />
      ) : null}
    </>
  )
}
