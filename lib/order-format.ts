import type {
  OrderActionType,
  OrderKitchenStatus,
  OrderPaymentStatus,
  SourceSettlementMode,
} from '@/lib/types/orders'

export function formatAmount(value: string | number | null | undefined) {
  if (value === null || value === undefined) return '-'
  const n = typeof value === 'string' ? Number(value) : value
  if (Number.isNaN(n)) return '-'
  return n.toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 3,
  })
}

export function formatDateTime(value: string | null | undefined) {
  if (!value) return '-'
  return new Date(value).toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })
}

export function kitchenStatusLabel(status: OrderKitchenStatus) {
  const labels: Record<OrderKitchenStatus, string> = {
    preparing: 'Preparing',
    ready: 'Ready',
    completed: 'Completed',
  }
  return labels[status]
}

export function paymentStatusLabel(status: OrderPaymentStatus) {
  const labels: Record<OrderPaymentStatus, string> = {
    unpaid: 'Unpaid',
    paid: 'Paid',
  }
  return labels[status]
}

export function orderActionLabel(type: OrderActionType) {
  const labels: Record<OrderActionType, string> = {
    void: 'Void',
    full_comp: 'Full Comp',
    partial_comp: 'Partial Comp',
    refund: 'Refund',
  }
  return labels[type]
}

export function settlementModeLabel(mode: SourceSettlementMode | null): string {
  if (mode === null) return '-'
  const labels: Record<SourceSettlementMode, string> = {
    cash_now: 'Cash Now',
    marketplace_receivable: 'Marketplace Receivable',
  }
  return labels[mode]
}
