'use client'

import { useMemo, useState, useTransition } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Trash2Icon } from 'lucide-react'
import { useKitchen } from '@/hooks/use-kitchen'
import { SiteHeader } from '@/components/layout/site-header'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { FieldError } from '@/components/ui/field'
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
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
  addOnlineSettlementOrder,
  removeOnlineSettlementOrder,
} from '../_lib/actions'
import {
  formatDate,
  formatDateTime,
  formatMoney,
  memberName,
} from '../_lib/format'
import type {
  EligibleSettlementOrder,
  OnlineSettlementDetail as OnlineSettlementDetailType,
  OnlineSettlementOrderRow,
} from '../_lib/detail-queries'
import { CompleteOnlineSettlementDialog } from './complete-online-settlement-dialog'
import { ReverseOnlineSettlementDialog } from './reverse-online-settlement-dialog'

interface OnlineSettlementDetailProps {
  kitchenId: string
  settlement: OnlineSettlementDetailType
  orders: OnlineSettlementOrderRow[]
  eligibleOrders: EligibleSettlementOrder[]
}

const STATUS_BADGE = {
  in_progress: { label: 'In Progress', variant: 'secondary' },
  completed: { label: 'Completed', variant: 'default' },
  reversed: { label: 'Reversed', variant: 'outline' },
} as const

function orderLabel(order: EligibleSettlementOrder) {
  return `#${order.order_number}${
    order.source_order_code ? ` - ${order.source_order_code}` : ''
  }`
}

export function OnlineSettlementDetail({
  kitchenId,
  settlement,
  orders,
  eligibleOrders,
}: OnlineSettlementDetailProps) {
  const { permissions } = useKitchen()
  const router = useRouter()
  const [selectedOrderId, setSelectedOrderId] = useState('')
  const [completeOpen, setCompleteOpen] = useState(false)
  const [reverseOpen, setReverseOpen] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [pendingActionId, setPendingActionId] = useState<string | null>(null)
  const [addPending, startAddTransition] = useTransition()

  const canUpdate = permissions.has('settlement.update')
  const isInProgress = settlement.status === 'in_progress'
  const isCompleted = settlement.status === 'completed'
  const isEditable = isInProgress && canUpdate
  const statusConfig = STATUS_BADGE[settlement.status]

  const selectedOrder = useMemo(
    () => eligibleOrders.find((order) => order.id === selectedOrderId) ?? null,
    [eligibleOrders, selectedOrderId]
  )

  const totals = useMemo(
    () =>
      orders.reduce(
        (sum, row) => ({
          receivable:
            sum.receivable + Number(row.effective_receivable_amount ?? 0),
          fee: sum.fee + Number(row.effective_platform_fee_amount ?? 0),
          payout: sum.payout + Number(row.effective_expected_payout ?? 0),
        }),
        { receivable: 0, fee: 0, payout: 0 }
      ),
    [orders]
  )

  function handleAddOrder() {
    setError(null)
    if (!selectedOrderId) {
      setError('Select an eligible order.')
      return
    }

    startAddTransition(async () => {
      const result = await addOnlineSettlementOrder(
        kitchenId,
        settlement.id,
        selectedOrderId
      )
      if (result instanceof Error) {
        setError(result.message)
        return
      }

      setSelectedOrderId('')
      router.refresh()
    })
  }

  function handleRemoveOrder(allocationId: string) {
    setError(null)
    setPendingActionId(allocationId)

    startAddTransition(async () => {
      const result = await removeOnlineSettlementOrder(kitchenId, allocationId)
      if (result instanceof Error) {
        setError(result.message)
        setPendingActionId(null)
        return
      }

      setPendingActionId(null)
      router.refresh()
    })
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <SiteHeader title="Online Settlement">
        <div className="ml-auto flex min-w-0 items-center gap-1">
          <Button variant="outline" size="sm" asChild>
            <Link href={`/${kitchenId}/settlement`}>Back</Link>
          </Button>
          {isEditable ? (
            <Button
              size="sm"
              disabled={orders.length === 0}
              onClick={() => setCompleteOpen(true)}
            >
              Complete
            </Button>
          ) : null}
          {isCompleted && canUpdate ? (
            <Button
              size="sm"
              variant="outline"
              onClick={() => setReverseOpen(true)}
            >
              Reverse
            </Button>
          ) : null}
        </div>
      </SiteHeader>

      <div className="border-b px-4 py-3">
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant={statusConfig.variant}>{statusConfig.label}</Badge>
          <Badge variant="outline">{settlement.source?.name ?? 'Online source'}</Badge>
          <span className="text-sm text-muted-foreground">
            {formatDate(settlement.period_start)} - {formatDate(settlement.period_end)}
          </span>
          <span className="ml-auto text-sm text-muted-foreground">
            {orders.length} orders
          </span>
        </div>
        {error ? <FieldError className="mt-2">{error}</FieldError> : null}
      </div>

      <div className="grid gap-0 border-b md:grid-cols-4">
        <div className="border-b px-4 py-3 md:border-r md:border-b-0">
          <p className="text-xs text-muted-foreground">Expected Payout</p>
          <p className="text-lg font-medium">{formatMoney(settlement.expected_payout)}</p>
        </div>
        <div className="border-b px-4 py-3 md:border-r md:border-b-0">
          <p className="text-xs text-muted-foreground">Actual Deposit</p>
          <p className="text-lg font-medium">{formatMoney(settlement.actual_deposit)}</p>
        </div>
        <div className="border-b px-4 py-3 md:border-r md:border-b-0">
          <p className="text-xs text-muted-foreground">Variance</p>
          <p className="text-lg font-medium">{formatMoney(settlement.variance_amount)}</p>
        </div>
        <div className="px-4 py-3">
          <p className="text-xs text-muted-foreground">Deposit Account</p>
          <p className="truncate text-sm font-medium">
            {settlement.settlement_account
              ? `${settlement.settlement_account.code} - ${settlement.settlement_account.name}`
              : '-'}
          </p>
        </div>
      </div>

      <div className="grid gap-0 border-b md:grid-cols-3">
        <div className="border-b px-4 py-3 md:border-r md:border-b-0">
          <p className="text-xs text-muted-foreground">Created</p>
          <p className="text-sm">
            {formatDateTime(settlement.created_at)} by{' '}
            {memberName(settlement.created_member)}
          </p>
        </div>
        <div className="border-b px-4 py-3 md:border-r md:border-b-0">
          <p className="text-xs text-muted-foreground">Completed</p>
          <p className="text-sm">
            {formatDateTime(settlement.completed_at)} by{' '}
            {memberName(settlement.completed_member)}
          </p>
        </div>
        <div className="px-4 py-3">
          <p className="text-xs text-muted-foreground">Reversed</p>
          <p className="text-sm">
            {formatDateTime(settlement.reversed_at)} by{' '}
            {memberName(settlement.reversed_member)}
          </p>
        </div>
      </div>

      {isEditable ? (
        <div className="flex flex-wrap items-center gap-2 border-b px-4 py-3">
          <div className="min-w-64 flex-1">
            <Select value={selectedOrderId} onValueChange={setSelectedOrderId}>
              <SelectTrigger>
                <SelectValue placeholder="Add eligible marketplace order" />
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  {eligibleOrders.map((order) => (
                    <SelectItem key={order.id} value={order.id}>
                      {orderLabel(order)} - {formatMoney(order.effective_expected_payout)}
                    </SelectItem>
                  ))}
                </SelectGroup>
              </SelectContent>
            </Select>
          </div>
          {selectedOrder ? (
            <span className="text-sm text-muted-foreground">
              Receivable {formatMoney(selectedOrder.effective_receivable_amount)}
            </span>
          ) : null}
          <Button
            size="sm"
            onClick={handleAddOrder}
            disabled={!selectedOrderId || addPending}
            className="min-w-24"
          >
            {addPending && !pendingActionId ? <Spinner data-icon="inline-start" /> : null}
            Add
          </Button>
        </div>
      ) : null}

      <div className="min-h-0 flex-1 overflow-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Order</TableHead>
              <TableHead>Date</TableHead>
              <TableHead>Receivable</TableHead>
              <TableHead>Platform Fee</TableHead>
              <TableHead>Expected Payout</TableHead>
              <TableHead>Payment</TableHead>
              {isEditable ? <TableHead className="w-16" /> : null}
            </TableRow>
          </TableHeader>
          <TableBody>
            {orders.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={isEditable ? 7 : 6}
                  className="h-24 text-center text-muted-foreground"
                >
                  No orders in this settlement.
                </TableCell>
              </TableRow>
            ) : (
              orders.map((row) => (
                <TableRow key={row.id}>
                  <TableCell>
                    <div className="flex min-w-36 flex-col">
                      <span className="font-mono text-sm">
                        #{row.order?.order_number ?? '-'}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {row.order?.source_order_code ?? row.order_id}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell>{formatDate(row.order?.created_at ?? null)}</TableCell>
                  <TableCell>{formatMoney(row.effective_receivable_amount)}</TableCell>
                  <TableCell>{formatMoney(row.effective_platform_fee_amount)}</TableCell>
                  <TableCell>{formatMoney(row.effective_expected_payout)}</TableCell>
                  <TableCell>
                    <Badge
                      variant={
                        row.order?.payment_status === 'paid' ? 'default' : 'outline'
                      }
                    >
                      {row.order?.payment_status ?? 'unpaid'}
                    </Badge>
                  </TableCell>
                  {isEditable ? (
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="icon-xs"
                        onClick={() => handleRemoveOrder(row.id)}
                        disabled={addPending}
                      >
                        {pendingActionId === row.id ? (
                          <Spinner className="size-3.5" />
                        ) : (
                          <Trash2Icon />
                        )}
                        <span className="sr-only">Remove order</span>
                      </Button>
                    </TableCell>
                  ) : null}
                </TableRow>
              ))
            )}
            {orders.length > 0 ? (
              <TableRow>
                <TableCell colSpan={2} className="font-medium">
                  Total
                </TableCell>
                <TableCell className="font-medium">
                  {formatMoney(totals.receivable)}
                </TableCell>
                <TableCell className="font-medium">{formatMoney(totals.fee)}</TableCell>
                <TableCell className="font-medium">
                  {formatMoney(totals.payout)}
                </TableCell>
                <TableCell />
                {isEditable ? <TableCell /> : null}
              </TableRow>
            ) : null}
          </TableBody>
        </Table>
      </div>

      <CompleteOnlineSettlementDialog
        kitchenId={kitchenId}
        settlementId={settlement.id}
        expectedPayout={settlement.expected_payout}
        open={completeOpen}
        onOpenChange={setCompleteOpen}
        onCompleted={() => router.refresh()}
      />
      <ReverseOnlineSettlementDialog
        kitchenId={kitchenId}
        settlementId={settlement.id}
        open={reverseOpen}
        onOpenChange={setReverseOpen}
        onReversed={() => router.refresh()}
      />
    </div>
  )
}
